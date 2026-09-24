import { HttpException, HttpStatus, NotFoundException } from "@nestjs/common";
import { ApiErrorCode, type ApiFailure } from "@checkout/contracts";

export type MappedApiError = {
  status: number;
  body: ApiFailure;
};

type CodedPayload = {
  code: string;
  message?: string;
  details?: unknown;
};

function failure(
  code: string,
  message: string,
  details?: unknown,
): ApiFailure {
  return {
    ok: false,
    error: details === undefined ? { code, message } : { code, message, details },
  };
}

function readCodedPayload(payload: unknown): CodedPayload | null {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }
  if (!("code" in payload)) {
    return null;
  }
  const code = (payload as { code: unknown }).code;
  if (typeof code !== "string") {
    return null;
  }
  const message =
    "message" in payload && typeof (payload as { message: unknown }).message === "string"
      ? (payload as { message: string }).message
      : undefined;
  const details =
    "details" in payload ? (payload as { details: unknown }).details : undefined;
  return { code, message, details };
}

function readValidationDetails(payload: unknown): unknown {
  if (typeof payload !== "object" || payload === null) {
    return undefined;
  }
  if (!("message" in payload)) {
    return undefined;
  }
  return (payload as { message: unknown }).message;
}

function mapCodedHttpException(exception: HttpException): MappedApiError | null {
  const coded = readCodedPayload(exception.getResponse());
  if (!coded) {
    return null;
  }
  return {
    status: exception.getStatus(),
    body: failure(
      coded.code,
      coded.message ?? exception.message,
      coded.details,
    ),
  };
}

function mapNestNotFound(exception: NotFoundException): MappedApiError {
  const coded = mapCodedHttpException(exception);
  if (coded) {
    return coded;
  }
  return {
    status: HttpStatus.NOT_FOUND,
    body: failure(ApiErrorCode.RouteNotFound, "Route not found"),
  };
}

function mapHttpException(exception: HttpException): MappedApiError {
  const coded = mapCodedHttpException(exception);
  if (coded) {
    return coded;
  }

  const status = exception.getStatus();
  if (status === HttpStatus.BAD_REQUEST) {
    return {
      status,
      body: failure(
        ApiErrorCode.ValidationError,
        "Validation failed",
        readValidationDetails(exception.getResponse()),
      ),
    };
  }

  return {
    status,
    body: failure(ApiErrorCode.Unexpected, "Unexpected error"),
  };
}

/**
 * Maps any thrown value to the API failure envelope + HTTP status.
 * Pure policy for the presentation adapter; the Nest filter only replies.
 */
export function mapExceptionToApiError(exception: unknown): MappedApiError {
  if (exception instanceof NotFoundException) {
    return mapNestNotFound(exception);
  }
  if (exception instanceof HttpException) {
    return mapHttpException(exception);
  }
  return {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    body: failure(ApiErrorCode.Unexpected, "Unexpected error"),
  };
}
