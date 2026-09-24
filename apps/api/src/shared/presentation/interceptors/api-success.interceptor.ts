import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import type { ApiSuccess } from "@checkout/contracts";
import { map, type Observable } from "rxjs";

@Injectable()
export class ApiSuccessInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiSuccess<unknown>> {
    return next.handle().pipe(
      map((data) => ({
        ok: true as const,
        data,
      })),
    );
  }
}
