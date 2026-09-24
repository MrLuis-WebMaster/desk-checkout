import type { ApiClientResult } from "@/shared/infrastructure/http/api-client";
import {
  mapApiErrorCode,
  type ScreenResult,
} from "../results/screen-result";

export function toScreenResult<T>(
  result: ApiClientResult<T>,
): ScreenResult<T> {
  if (result.ok) {
    return { status: "ok", value: result.data };
  }
  if (result.error.kind === "aborted") {
    return { status: "aborted" };
  }
  if (result.error.kind === "api") {
    return mapApiErrorCode(result.error.code);
  }
  return { status: "load_failed" };
}
