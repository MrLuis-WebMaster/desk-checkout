import { PaymentGatewayError } from "../../domain/payment/errors";
import { GetPaymentConfigUseCase } from "./get-payment-config.use-case";

describe("GetPaymentConfigUseCase", () => {
  const gateway = {
    getAcceptanceTokens: jest.fn(),
    createCardPayment: jest.fn(),
    createWidgetSession: jest.fn(),
    getPaymentStatus: jest.fn(),
    voidPayment: jest.fn(),
  };
  const useCase = new GetPaymentConfigUseCase(gateway as never);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("returns acceptance tokens from the gateway", async () => {
    const tokens = {
      publicKey: "pub",
      acceptanceToken: "acc",
      acceptanceTokenType: "END_USER_POLICY",
      acceptPersonalAuth: "auth",
      acceptPersonalAuthType: "PERSONAL_DATA_AUTH",
    };
    gateway.getAcceptanceTokens.mockResolvedValue(tokens);
    await expect(useCase.execute()).resolves.toEqual({
      ok: true,
      value: tokens,
    });
  });

  it("maps PaymentGatewayError and unknown failures", async () => {
    gateway.getAcceptanceTokens.mockRejectedValue(
      new PaymentGatewayError("down"),
    );
    let result = await useCase.execute();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(PaymentGatewayError);
    }

    gateway.getAcceptanceTokens.mockRejectedValue(new Error("boom"));
    result = await useCase.execute();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toMatch(/unavailable/i);
    }
  });
});
