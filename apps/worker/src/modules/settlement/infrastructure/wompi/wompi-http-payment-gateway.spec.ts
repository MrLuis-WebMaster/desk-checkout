import { TransactionStatus } from "@checkout/contracts";
import { WompiHttpPaymentGateway } from "./wompi-http-payment-gateway.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("WompiHttpPaymentGateway (worker)", () => {
  const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>();
  const gateway = new WompiHttpPaymentGateway(
    "https://sandbox.wompi.co/v1",
    "prv_test",
  );

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as typeof fetch;
  });

  it("reads payment status from the provider", async () => {
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

    await expect(gateway.getPaymentStatus("wompi_1")).resolves.toEqual({
      providerTransactionId: "wompi_1",
      status: TransactionStatus.Approved,
      reference: "tx-1",
      amountInCents: 1_200_000,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://sandbox.wompi.co/v1/transactions/wompi_1",
      expect.objectContaining({
        headers: { Authorization: "Bearer prv_test" },
      }),
    );
  });

  it("reads nested transaction payloads", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        data: {
          transaction: {
            id: "wompi_nested",
            status: "PENDING",
            reference: "tx-2",
          },
        },
      }),
    );

    await expect(gateway.getPaymentStatus("wompi_nested")).resolves.toEqual({
      providerTransactionId: "wompi_nested",
      status: TransactionStatus.Pending,
      reference: "tx-2",
      amountInCents: undefined,
    });
  });

  it("voids a provider payment", async () => {
    fetchMock.mockResolvedValueOnce(new Response("", { status: 200 }));
    await expect(gateway.voidPayment("wompi_1")).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://sandbox.wompi.co/v1/transactions/wompi_1/void",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("maps non-OK responses without leaking Authorization secrets", async () => {
    fetchMock.mockResolvedValueOnce(new Response("down", { status: 503 }));
    try {
      await gateway.getPaymentStatus("x");
      fail("expected error");
    } catch (error) {
      expect(error).toMatchObject({ message: expect.stringMatching(/status 503/) });
      const text =
        error instanceof Error ? `${error.message}\n${error.stack}` : String(error);
      expect(text).not.toContain("prv_test");
      expect(text).not.toContain("Authorization");
    }
  });

  it("rejects payloads without a transaction id", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: {} }));
    await expect(gateway.getPaymentStatus("x")).rejects.toThrow(
      /transaction id is missing/,
    );
  });

  it("rejects unsupported provider statuses", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ data: { id: "wompi_1", status: "WEIRD" } }),
    );
    await expect(gateway.getPaymentStatus("wompi_1")).rejects.toThrow(
      /Unsupported Wompi status/,
    );
  });
});
