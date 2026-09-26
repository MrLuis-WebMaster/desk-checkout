import { Module } from "@nestjs/common";
import { getDataSourceToken } from "@nestjs/typeorm";
import { TypeOrmOutboxStore } from "@checkout/settlement-typeorm";
import { RabbitConnectionManager } from "@checkout/messaging";
import { DataSource } from "typeorm";
import {
  PaymentsMessagingModule,
  WORKER_RABBIT_CONNECTION,
} from "../../payments/presentation/payments-messaging.module.js";
import { OutboxPublisher } from "./outbox.publisher.js";

@Module({
  imports: [PaymentsMessagingModule],
  providers: [
    {
      provide: TypeOrmOutboxStore,
      useFactory: (dataSource: DataSource) =>
        new TypeOrmOutboxStore(dataSource),
      inject: [getDataSourceToken()],
    },
    {
      provide: OutboxPublisher,
      useFactory: (
        outbox: TypeOrmOutboxStore,
        rabbit: RabbitConnectionManager,
      ) => new OutboxPublisher(outbox, rabbit),
      inject: [TypeOrmOutboxStore, WORKER_RABBIT_CONNECTION],
    },
  ],
})
export class OutboxModule {
  constructor(private readonly _publisher: OutboxPublisher) {}
}
