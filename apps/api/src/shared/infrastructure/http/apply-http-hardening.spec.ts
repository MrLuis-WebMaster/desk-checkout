import type { INestApplication } from "@nestjs/common";
import { applyApiHttpHardening } from "./apply-http-hardening.js";

describe("applyApiHttpHardening", () => {
  function createAppMock() {
    const set = jest.fn();
    const use = jest.fn();
    const app = {
      getHttpAdapter: () => ({
        getInstance: () => ({ set }),
      }),
      use,
    } as unknown as INestApplication;
    return { app, set, use };
  }

  it("sets trust proxy and registers body parsers plus helmet", () => {
    const { app, set, use } = createAppMock();
    applyApiHttpHardening(app, {
      nodeEnv: "production",
      trustProxyEnv: "1",
      enableSwaggerCsp: false,
    });
    expect(set).toHaveBeenCalledWith("trust proxy", 1);
    expect(use).toHaveBeenCalled();
    expect(use.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it("uses swagger-oriented CSP when enabled", () => {
    const { app, use } = createAppMock();
    applyApiHttpHardening(app, {
      nodeEnv: "development",
      enableSwaggerCsp: true,
    });
    expect(use).toHaveBeenCalled();
  });
});
