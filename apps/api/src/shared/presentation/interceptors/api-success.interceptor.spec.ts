import { of } from "rxjs";
import { ApiSuccessInterceptor } from "./api-success.interceptor";

describe("ApiSuccessInterceptor", () => {
  it("wraps controller data in ApiSuccess", (done) => {
    const interceptor = new ApiSuccessInterceptor();
    interceptor
      .intercept({} as never, {
        handle: () => of({ id: "1" }),
      })
      .subscribe((value) => {
        expect(value).toEqual({ ok: true, data: { id: "1" } });
        done();
      });
  });
});
