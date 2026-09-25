import { createHash } from "node:crypto";
import { TransactionStatus } from "@checkout/contracts";
import { PaymentGatewayError } from "../../domain/payment/errors.js";
import { WompiHttpPaymentGateway } from "./wompi-http-payment-gateway.js";

jest.mock("#config/env.js", () => ({
  env: {
    WOMPI_BASE_URL: "https://sandbox.wompi.co/v1",
    WOMPI_PUBLIC_KEY: "pub_test",
    WOMPI_PRIVATE_KEY: "prv_test",
    WOMPI_INTEGRITY_SECRET: "integrity_test",
  },
}));

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("WompiHttpPaymentGateway", () => {
  const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>();
  const gateway = new WompiHttpPaymentGateway();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as typeof fetch;
  });

  it("loads acceptance tokens from merchant info", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        data: {
          presigned_acceptance: {
            acceptance_token: "acc",
            type: "END_USER_POLICY",
          },
          presigned_personal_data_auth: {
            acceptance_token: "pda",
            type: "PERSONAL_DATA_AUTH",
          },
        },
      }),
    );

    await expect(gateway.getAcceptanceTokens()).resolves.toEqual({
      publicKey: "pub_test",
      acceptanceToken: "acc",
      acceptanceTokenType: "END_USER_POLICY",
      acceptPersonalAuth: "pda",
      acceptPersonalAuthType: "PERSONAL_DATA_AUTH",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://sandbox.wompi.co/v1/merchants/info",
      expect.objectContaining({
        headers: { "x-merchant-public-key": "pub_test" },
      }),
    );
  });

  it("rejects missing acceptance tokens", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: {} }));
    await expect(gateway.getAcceptanceTokens()).rejects.toBeInstanceOf(
      PaymentGatewayError,
    );
  });

  it("creates a card payment with integrity signature", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        data: {
          id: "wompi_1",
          status: "APPROVED",
          reference: "tx-1",
          amount_in_cents: 1_200_000,
        },
      }),
    );

    const payment = await gateway.createCardPayment({
      reference: "tx-1",
      amountInCents: 1_200_000,
      currency: "COP",
      customerEmail: "ada@example.com",
      acceptanceToken: "acc",
      acceptPersonalAuth: "pda",
      paymentMethodToken: "tok_1",
      installments: 1,
    });

    expect(payment).toEqual({
      providerTransactionId: "wompi_1",
      status: TransactionStatus.Approved,
      reference: "tx-1",
      amountInCents: 1_200_000,
    });

    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse(String(init?.body)) as {
      signature: string;
      payment_method: { type: string; token: string };
    };
    const expectedSignature = createHash("sha256")
      .update(`tx-11200000COPintegrity_test`)
      .digest("hex");
    expect(body.signature).toBe(expectedSignature);
    expect(body.payment_method).toEqual({
      type: "CARD",
      token: "tok_1",
      installments: 1,
    });
  });

  it("builds a widget session without calling the network", () => {
    const session = gateway.createWidgetSession({
      reference: "tx-1",
      amountInCents: 1_200_000,
      currency: "COP",
    });
    expect(session.publicKey).toBe("pub_test");
    expect(session.signature).toBe(
      createHash("sha256")
        .update(`tx-11200000COPintegrity_test`)
        .digest("hex"),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reads payment status from nested transaction payloads", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        data: {
          transaction: {
            id: "wompi_nested",
            status: "DECLINED",
            reference: "tx-2",
            amount_in_cents: 500,
          },
        },
      }),
    );

    await expect(gateway.getPaymentStatus("wompi_nested")).resolves.toEqual({
      providerTransactionId: "wompi_nested",
      status: TransactionStatus.Declined,
      reference: "tx-2",
      amountInCents: 500,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://sandbox.wompi.co/v1/transactions/wompi_nested",
      expect.objectContaining({
        headers: { Authorization: "Bearer prv_test" },
      }),
    );
  });

  it("voids a provider payment", async () => {
    fetchMock.mockResolvedValueOnce(new Response("", { status: 200 }));
    await expect(gateway.voidPayment("wompi_1")).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://sandbox.wompi.co/v1/transactions/wompi_1/void",
      expect.objectContaining({
        method: "POST",
        headers: { Authorization: "Bearer prv_test" },
      }),
    );
  });

  it("maps non-OK responses to PaymentGatewayError", async () => {
    fetchMock.mockResolvedValueOnce(new Response("nope", { status: 502 }));
    await expect(gateway.getPaymentStatus("x")).rejects.toThrow(
      /status 502/,
    );
  });

  it("rejects payloads without a transaction id", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { status: "APPROVED" } }));
    await expect(gateway.getPaymentStatus("x")).rejects.toThrow(
      /transaction id is missing/,
    );
  });

  it("rejects unsupported provider statuses", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ data: { id: "wompi_1", status: "WEIRD" } }),
    );
    await expect(gateway.getPaymentStatus("wompi_1")).rejects.toBeInstanceOf(
      PaymentGatewayError,
    );
  });
});
