import { HttpException, HttpStatus, Logger } from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import { WorkerExceptionFilter } from "./worker-exception.filter.js";

describe("WorkerExceptionFilter", () => {
  it("maps unexpected errors to a simple JSON envelope", () => {
    const reply = jest.fn();
    const filter = new WorkerExceptionFilter({
      httpAdapter: { reply },
    } as unknown as HttpAdapterHost);
    const errorSpy = jest.spyOn(Logger.prototype, "error").mockImplementation();
    process.env.WOMPI_PRIVATE_KEY = "prv_worker_secret";

    filter.catch(new Error("Bearer prv_worker_secret boom"), {
      switchToHttp: () => ({
        getResponse: () => ({ tag: "response" }),
      }),
    } as never);

    expect(reply).toHaveBeenCalledWith(
      { tag: "response" },
      {
        ok: false,
        error: { code: "UNEXPECTED", message: "Unexpected error" },
      },
      500,
    );
    const [message] = errorSpy.mock.calls[0]!;
    expect(String(message)).not.toContain("prv_worker_secret");
    errorSpy.mockRestore();
  });

  it("passes through client HttpException payloads", () => {
    const reply = jest.fn();
    const filter = new WorkerExceptionFilter({
      httpAdapter: { reply },
    } as unknown as HttpAdapterHost);

    filter.catch(
      new HttpException(
        { ok: false, reason: "bad_checksum" },
        HttpStatus.BAD_REQUEST,
      ),
      {
        switchToHttp: () => ({
          getResponse: () => ({ tag: "response" }),
        }),
      } as never,
    );

    expect(reply).toHaveBeenCalledWith(
      { tag: "response" },
      { ok: false, reason: "bad_checksum" },
      400,
    );
  });
});
