import type { ApiFailure, ApiSuccess } from "@checkout/contracts";
import { env } from "@/config/env";

export type ApiClientError =
  | { kind: "network" }
  | { kind: "aborted" }
  | { kind: "invalid_body" }
  | { kind: "api"; code: string; message: string; details?: unknown };

export type ApiClientResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiClientError };

export type ApiRequest = {
  url: string;
  init: RequestInit;
};

export type RequestInterceptor = (
  request: ApiRequest,
) => ApiRequest | Promise<ApiRequest>;

export type ResponseInterceptor = (
  response: Response,
  request: ApiRequest,
) => Response | Promise<Response>;

export type ApiGetOptions = {
  query?: Record<string, string | undefined>;
  signal?: AbortSignal;
};

export type ApiPostOptions = {
  query?: Record<string, string | undefined>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

function isApiSuccess<T>(body: object): body is ApiSuccess<T> {
  return (
    "ok" in body &&
    (body as { ok: unknown }).ok === true &&
    "data" in body
  );
}

function isApiFailure(body: object): body is ApiFailure {
  if (!("ok" in body) || (body as { ok: unknown }).ok !== false) {
    return false;
  }
  if (!("error" in body) || typeof (body as { error: unknown }).error !== "object") {
    return false;
  }
  const error = (body as ApiFailure).error;
  return (
    error !== null &&
    typeof error.code === "string" &&
    typeof error.message === "string"
  );
}

function parseEnvelope<T>(body: unknown): ApiClientResult<T> {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: { kind: "invalid_body" } };
  }
  if (isApiSuccess<T>(body)) {
    return { ok: true, data: body.data };
  }
  if (isApiFailure(body)) {
    return {
      ok: false,
      error: {
        kind: "api",
        code: body.error.code,
        message: body.error.message,
        details: body.error.details,
      },
    };
  }
  return { ok: false, error: { kind: "invalid_body" } };
}

function buildUrl(
  baseUrl: string,
  path: string,
  query?: Record<string, string | undefined>,
): string {
  const url = new URL(
    path.startsWith("/") ? path.slice(1) : path,
    `${baseUrl}/`,
  );
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, value);
      }
    }
  }
  return url.toString();
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  );
}

export class ApiClient {
  private readonly requestInterceptors: RequestInterceptor[] = [];
  private readonly responseInterceptors: ResponseInterceptor[] = [];

  constructor(private readonly baseUrl: string) {}

  useRequest(interceptor: RequestInterceptor): this {
    this.requestInterceptors.push(interceptor);
    return this;
  }

  useResponse(interceptor: ResponseInterceptor): this {
    this.responseInterceptors.push(interceptor);
    return this;
  }

  get<T>(
    path: string,
    queryOrOptions?: Record<string, string | undefined> | ApiGetOptions,
    maybeOptions?: Pick<ApiGetOptions, "signal">,
  ): Promise<ApiClientResult<T>> {
    const options = normalizeGetOptions(queryOrOptions, maybeOptions);
    return this.request<T>(
      path,
      { method: "GET", signal: options.signal },
      options.query,
    );
  }

  post<T>(
    path: string,
    body?: unknown,
    queryOrOptions?: Record<string, string | undefined> | ApiPostOptions,
  ): Promise<ApiClientResult<T>> {
    const options = normalizePostOptions(queryOrOptions);
    return this.request<T>(
      path,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: options.signal,
      },
      options.query,
    );
  }

  private async request<T>(
    path: string,
    init: RequestInit,
    query?: Record<string, string | undefined>,
  ): Promise<ApiClientResult<T>> {
    let request: ApiRequest = {
      url: buildUrl(this.baseUrl, path, query),
      init: { ...init },
    };

    try {
      for (const interceptor of this.requestInterceptors) {
        request = await interceptor(request);
      }

      let response = await fetch(request.url, request.init);
      for (const interceptor of this.responseInterceptors) {
        response = await interceptor(response, request);
      }

      let body: unknown;
      try {
        body = await response.json();
      } catch (error) {
        if (isAbortError(error) || request.init.signal?.aborted) {
          return { ok: false, error: { kind: "aborted" } };
        }
        return { ok: false, error: { kind: "invalid_body" } };
      }

      return parseEnvelope<T>(body);
    } catch (error) {
      if (isAbortError(error) || init.signal?.aborted) {
        return { ok: false, error: { kind: "aborted" } };
      }
      return { ok: false, error: { kind: "network" } };
    }
  }
}

function normalizeGetOptions(
  queryOrOptions?: Record<string, string | undefined> | ApiGetOptions,
  maybeOptions?: Pick<ApiGetOptions, "signal">,
): ApiGetOptions {
  if (!queryOrOptions) {
    return { signal: maybeOptions?.signal };
  }
  if (
    "query" in queryOrOptions ||
    "signal" in queryOrOptions
  ) {
    const options = queryOrOptions as ApiGetOptions;
    return {
      query: options.query,
      signal: options.signal ?? maybeOptions?.signal,
    };
  }
  return {
    query: queryOrOptions as Record<string, string | undefined>,
    signal: maybeOptions?.signal,
  };
}

function normalizePostOptions(
  queryOrOptions?: Record<string, string | undefined> | ApiPostOptions,
): ApiPostOptions {
  if (!queryOrOptions) {
    return {};
  }
  if (
    "query" in queryOrOptions ||
    "headers" in queryOrOptions ||
    "signal" in queryOrOptions
  ) {
    return queryOrOptions as ApiPostOptions;
  }
  return {
    query: queryOrOptions as Record<string, string | undefined>,
  };
}

export const apiClient = new ApiClient(env.VITE_API_URL);
