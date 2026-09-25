import { HttpException, HttpStatus, Logger } from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import { ApiErrorCode } from "@checkout/contracts";
import { ApiExceptionFilter } from "./api-exception.filter";

describe("ApiExceptionFilter", () => {
  it("replies with the mapped status and body", () => {
    const reply = jest.fn();
    const filter = new ApiExceptionFilter({
      httpAdapter: { reply },
    } as unknown as HttpAdapterHost);

    filter.catch(
      new HttpException(
        {
          code: ApiErrorCode.ProductNotFound,
          message: "Product not found",
        },
        HttpStatus.NOT_FOUND,
      ),
      {
        switchToHttp: () => ({
          getResponse: () => ({ tag: "response" }),
        }),
      } as never,
    );

    expect(reply).toHaveBeenCalledWith(
      { tag: "response" },
      {
        ok: false,
        error: {
          code: ApiErrorCode.ProductNotFound,
          message: "Product not found",
        },
      },
      404,
    );
  });

  it("redacts secrets when logging unexpected errors", () => {
    const reply = jest.fn();
    const filter = new ApiExceptionFilter({
      httpAdapter: { reply },
    } as unknown as HttpAdapterHost);
    const errorSpy = jest.spyOn(Logger.prototype, "error").mockImplementation();
    process.env.WOMPI_PRIVATE_KEY = "prv_filter_secret";

    const boom = new Error("Authorization: Bearer prv_filter_secret exploded");
    boom.stack = "Error: Bearer prv_filter_secret\n    at test";

    filter.catch(boom, {
      switchToHttp: () => ({
        getResponse: () => ({ tag: "response" }),
      }),
    } as never);

    expect(errorSpy).toHaveBeenCalled();
    const [message, stack] = errorSpy.mock.calls[0]!;
    expect(String(message)).not.toContain("prv_filter_secret");
    expect(String(stack ?? "")).not.toContain("prv_filter_secret");
    errorSpy.mockRestore();
  });
});
