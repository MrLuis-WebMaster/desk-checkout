import { HttpException, HttpStatus } from "@nestjs/common";
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
});
