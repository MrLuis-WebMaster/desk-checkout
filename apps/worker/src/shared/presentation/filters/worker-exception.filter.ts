import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";

function redactSecrets(input: string): string {
  let output = input;
  output = output.replace(
    /Authorization\s*[:=]\s*[^\n,;]+/gi,
    "Authorization: [REDACTED]",
  );
  output = output.replace(/Bearer\s+[^\s"'\\]+/gi, "Bearer [REDACTED]");
  for (const key of [
    "WOMPI_PRIVATE_KEY",
    "WOMPI_INTEGRITY_SECRET",
    "WOMPI_EVENTS_SECRET",
  ] as const) {
    const value = process.env[key];
    if (value && value.trim().length > 0) {
      output = output.split(value).join(`[REDACTED_${key}]`);
    }
  }
  return output;
}

/**
 * Lightweight filter: preserve client HttpException payloads (e.g. webhook 400),
 * hide raw 5xx bodies, and redact secrets from logs.
 */
@Catch()
export class WorkerExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(WorkerExceptionFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const response = host.switchToHttp().getResponse();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      if (status < 500) {
        httpAdapter.reply(response, payload, status);
        return;
      }
      this.logger.error(
        redactSecrets(
          typeof payload === "string" ? payload : exception.message,
        ),
        exception.stack ? redactSecrets(exception.stack) : undefined,
      );
      httpAdapter.reply(
        response,
        {
          ok: false,
          error: { code: "UNEXPECTED", message: "Unexpected error" },
        },
        status,
      );
      return;
    }

    this.logger.error(
      redactSecrets(
        exception instanceof Error ? exception.message : String(exception),
      ),
      exception instanceof Error && exception.stack
        ? redactSecrets(exception.stack)
        : undefined,
    );
    httpAdapter.reply(
      response,
      {
        ok: false,
        error: {
          code: "UNEXPECTED",
          message: "Unexpected error",
        },
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
