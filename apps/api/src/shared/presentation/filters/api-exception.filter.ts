import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import { mapExceptionToApiError } from "../mappers/api-error.mapper.js";

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const response = host.switchToHttp().getResponse();
    const { status, body } = mapExceptionToApiError(exception);

    if (!(exception instanceof HttpException) || status >= 500) {
      this.logger.error(
        body.error.message,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    httpAdapter.reply(response, body, status);
  }
}
