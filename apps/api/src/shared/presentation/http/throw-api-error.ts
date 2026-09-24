import { HttpException } from "@nestjs/common";

export function throwApiError(
  code: string,
  message: string,
  status: number,
): never {
  throw new HttpException({ code, message }, status);
}
