import { HttpException } from "@nestjs/common";
import { PaymentsController } from "./payments.controller";

describe("PaymentsController", () => {
  const getPaymentConfig = { execute: jest.fn() };
  const controller = new PaymentsController(getPaymentConfig as never);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("returns payment config data", async () => {
    const value = {
      publicKey: "pub",
      acceptanceToken: "acc",
      acceptanceTokenType: "END_USER_POLICY",
      acceptPersonalAuth: "auth",
      acceptPersonalAuthType: "PERSONAL_DATA_AUTH",
    };
    getPaymentConfig.execute.mockResolvedValue({ ok: true, value });
    await expect(controller.config()).resolves.toEqual(value);
  });

  it("throws when the gateway fails", async () => {
    getPaymentConfig.execute.mockResolvedValue({
      ok: false,
      error: new Error("down"),
    });
    await expect(controller.config()).rejects.toBeInstanceOf(HttpException);
  });
});
