import amqp, {
  type ChannelModel,
  type ConfirmChannel,
  type ConsumeMessage,
} from "amqplib";
import {
  assertQueueTriplet,
  ORDER_CONFIRMED_QUEUES,
  PAYMENT_EVENTS_QUEUES,
  type QueueTriplet,
} from "./topology.js";
import { handleConsumerFailure, DeadLetterError } from "./retry.js";

export class RabbitUnavailableError extends Error {
  constructor(message = "RabbitMQ unavailable") {
    super(message);
    this.name = "RabbitUnavailableError";
  }
}

export type RabbitConnectionManagerOptions = {
  url: string;
  reconnectDelayMs?: number;
  /** Extra queue triplets to assert (defaults include payment + order). */
  queues?: QueueTriplet[];
  logger?: {
    info: (message: string, meta?: Record<string, unknown>) => void;
    error: (message: string, meta?: Record<string, unknown>) => void;
  };
};

type ConsumerRegistration = {
  queues: QueueTriplet;
  handler: (payload: unknown, raw: ConsumeMessage) => Promise<void>;
};

const noopLogger = {
  info: () => undefined,
  error: () => undefined,
};

/**
 * Background reconnecting connection. `start()` never throws; publish fails
 * with `RabbitUnavailableError` until a confirm channel exists.
 * Consumer registrations survive reconnects.
 */
export class RabbitConnectionManager {
  private readonly url: string;
  private readonly reconnectDelayMs: number;
  private readonly queues: QueueTriplet[];
  private readonly logger: NonNullable<RabbitConnectionManagerOptions["logger"]>;
  private connection: ChannelModel | null = null;
  private channel: ConfirmChannel | null = null;
  private stopped = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connecting: Promise<void> | null = null;
  private readonly consumers: ConsumerRegistration[] = [];

  constructor(options: RabbitConnectionManagerOptions) {
    this.url = options.url;
    this.reconnectDelayMs = options.reconnectDelayMs ?? 3_000;
    this.queues = options.queues ?? [
      PAYMENT_EVENTS_QUEUES,
      ORDER_CONFIRMED_QUEUES,
    ];
    this.logger = options.logger ?? noopLogger;
  }

  /** Fire-and-forget connect; safe to call during Nest bootstrap. */
  start(): void {
    this.stopped = false;
    void this.ensureConnected();
  }

  async stop(): Promise<void> {
    this.stopped = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.consumers.length = 0;
    const channel = this.channel;
    const connection = this.connection;
    this.channel = null;
    this.connection = null;
    try {
      await channel?.close();
    } catch {
      // ignore
    }
    try {
      await connection?.close();
    } catch {
      // ignore
    }
  }

  isConnected(): boolean {
    return this.channel !== null;
  }

  async publish(
    queue: string,
    payload: unknown,
    headers?: Record<string, unknown>,
  ): Promise<void> {
    const channel = this.channel;
    if (!channel) {
      throw new RabbitUnavailableError();
    }
    const body = Buffer.from(JSON.stringify(payload), "utf8");
    const ok = channel.publish("", queue, body, {
      persistent: true,
      contentType: "application/json",
      headers,
    });
    if (!ok) {
      await new Promise<void>((resolve) => channel.once("drain", resolve));
    }
    await channel.waitForConfirms();
  }

  /**
   * Registers a consumer. The registration is kept and re-bound after every
   * successful reconnect. Replacing the handler for an already-bound queue
   * updates the registration in place without attaching a second consumer.
   */
  async consume(
    queues: QueueTriplet,
    handler: (payload: unknown, raw: ConsumeMessage) => Promise<void>,
  ): Promise<void> {
    const existing = this.consumers.find((c) => c.queues.main === queues.main);
    if (existing) {
      existing.handler = handler;
      if (this.channel) {
        return;
      }
      void this.ensureConnected();
      return;
    }
    const registration: ConsumerRegistration = { queues, handler };
    this.consumers.push(registration);
    if (!this.channel) {
      // Will bind after connectOnce completes.
      void this.ensureConnected();
      return;
    }
    await this.bindConsumer(this.channel, registration);
  }

  private async bindConsumer(
    channel: ConfirmChannel,
    registration: ConsumerRegistration,
  ): Promise<void> {
    await channel.prefetch(1);
    await channel.consume(
      registration.queues.main,
      (message) => {
        if (!message) {
          return;
        }
        void this.dispatch(
          channel,
          registration.queues,
          message,
          registration.handler,
        );
      },
      { noAck: false },
    );
  }

  private async rebindConsumers(channel: ConfirmChannel): Promise<void> {
    for (const registration of this.consumers) {
      try {
        await this.bindConsumer(channel, registration);
        this.logger.info("rabbit_consumer_rebound", {
          queue: registration.queues.main,
        });
      } catch (error) {
        this.logger.error("rabbit_consumer_rebind_failed", {
          queue: registration.queues.main,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  private async dispatch(
    channel: ConfirmChannel,
    queues: QueueTriplet,
    message: ConsumeMessage,
    handler: (payload: unknown, raw: ConsumeMessage) => Promise<void>,
  ): Promise<void> {
    try {
      const text = message.content.toString("utf8");
      const payload: unknown = JSON.parse(text);
      await handler(payload, message);
      channel.ack(message);
    } catch (error) {
      this.logger.error("rabbit_consumer_handler_failed", {
        queue: queues.main,
        error: error instanceof Error ? error.message : String(error),
      });
      try {
        await handleConsumerFailure({
          queues,
          message: {
            content: message.content,
            properties: {
              headers: message.properties.headers as
                | Record<string, unknown>
                | undefined,
            },
          },
          publish: async (queue, content, options) => {
            channel.publish("", queue, content, {
              persistent: options.persistent,
              headers: options.headers,
              contentType: options.contentType,
            });
            await channel.waitForConfirms();
          },
          ack: () => {
            channel.ack(message);
          },
          immediateDlq: error instanceof DeadLetterError,
        });
      } catch (retryError) {
        this.logger.error("rabbit_consumer_retry_failed", {
          queue: queues.main,
          error:
            retryError instanceof Error
              ? retryError.message
              : String(retryError),
        });
        try {
          channel.nack(message, false, false);
        } catch {
          // channel may already be closed
        }
      }
    }
  }

  private ensureConnected(): Promise<void> {
    if (this.stopped) {
      return Promise.resolve();
    }
    if (this.channel) {
      return Promise.resolve();
    }
    if (this.connecting) {
      return this.connecting;
    }
    this.connecting = this.connectOnce().finally(() => {
      this.connecting = null;
    });
    return this.connecting;
  }

  private async connectOnce(): Promise<void> {
    try {
      const connection = await amqp.connect(this.url);
      if (this.stopped) {
        await connection.close();
        return;
      }
      const channel = await connection.createConfirmChannel();
      for (const triplet of this.queues) {
        await assertQueueTriplet(
          (queue, options) => channel.assertQueue(queue, options),
          triplet,
        );
      }
      connection.on("error", (error) => {
        this.logger.error("rabbit_connection_error", {
          error: error instanceof Error ? error.message : String(error),
        });
        this.clearSocket();
        this.scheduleReconnect();
      });
      connection.on("close", () => {
        this.clearSocket();
        this.scheduleReconnect();
      });
      this.connection = connection;
      this.channel = channel;
      this.logger.info("rabbit_connected");
      await this.rebindConsumers(channel);
    } catch (error) {
      this.logger.error("rabbit_connect_failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      this.clearSocket();
      this.scheduleReconnect();
    }
  }

  private clearSocket(): void {
    this.channel = null;
    this.connection = null;
  }

  private scheduleReconnect(): void {
    if (this.stopped || this.reconnectTimer) {
      return;
    }
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.ensureConnected();
    }, this.reconnectDelayMs);
  }
}
