import {
  BadRequestException,
  HttpException,
  HttpStatus,
  NotFoundException,
} from "@nestjs/common";
import { ApiErrorCode } from "@checkout/contracts";
import { mapExceptionToApiError } from "./api-error.mapper";

describe("mapExceptionToApiError", () => {
  it("maps ValidationPipe errors to VALIDATION_ERROR", () => {
    expect(
      mapExceptionToApiError(
        new BadRequestException({
          message: ["page must be an integer"],
          error: "Bad Request",
          statusCode: 400,
        }),
      ),
    ).toEqual({
      status: 400,
      body: {
        ok: false,
        error: {
          code: ApiErrorCode.ValidationError,
          message: "Validation failed",
          details: ["page must be an integer"],
        },
      },
    });
  });

  it("maps ProductNotFound payload to ProductNotFound", () => {
    expect(
      mapExceptionToApiError(
        new HttpException(
          {
            code: ApiErrorCode.ProductNotFound,
            message: "Product not found",
          },
          HttpStatus.NOT_FOUND,
        ),
      ),
    ).toEqual({
      status: 404,
      body: {
        ok: false,
        error: {
          code: ApiErrorCode.ProductNotFound,
          message: "Product not found",
        },
      },
    });
  });

  it("maps unknown routes to ROUTE_NOT_FOUND", () => {
    expect(mapExceptionToApiError(new NotFoundException())).toEqual({
      status: 404,
      body: {
        ok: false,
        error: {
          code: ApiErrorCode.RouteNotFound,
          message: "Route not found",
        },
      },
    });
  });

  it("maps unexpected errors without a stack or internal message", () => {
    const mapped = mapExceptionToApiError(new Error("secret db detail"));
    expect(mapped).toEqual({
      status: 500,
      body: {
        ok: false,
        error: {
          code: ApiErrorCode.Unexpected,
          message: "Unexpected error",
        },
      },
    });
    expect(JSON.stringify(mapped)).not.toContain("secret db detail");
  });

  it("keeps a coded payload on NotFoundException", () => {
    expect(
      mapExceptionToApiError(
        new NotFoundException({
          code: ApiErrorCode.ProductNotFound,
          message: "Product not found",
        }),
      ),
    ).toEqual({
      status: 404,
      body: {
        ok: false,
        error: {
          code: ApiErrorCode.ProductNotFound,
          message: "Product not found",
        },
      },
    });
  });
});
