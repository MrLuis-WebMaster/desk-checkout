import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  HttpPaymentAdapter,
  HttpShippingAdapter,
  HttpTransactionAdapter,
} from "./http-checkout.adapter";

const { get, post } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock("@/shared/infrastructure/http/api-client", () => ({
  apiClient: {
    get: (...args: unknown[]) => get(...args),
    post: (...args: unknown[]) => post(...args),
  },
}));

describe("http-checkout.adapter", () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
  });

  it("loads payment config", async () => {
    get.mockResolvedValueOnce({ ok: true, data: { publicKey: "pub" } });
    const adapter = new HttpPaymentAdapter();
    await expect(adapter.getPaymentConfig()).resolves.toEqual({
      status: "ok",
      value: { publicKey: "pub" },
    });
    expect(get).toHaveBeenCalledWith("/payments/config", { signal: undefined });
  });

  it("loads checkout settings and shipping quotes", async () => {
    get
      .mockResolvedValueOnce({ ok: true, data: { baseFee: 500 } })
      .mockResolvedValueOnce({
        ok: true,
        data: [{ id: "m1", code: "STD", name: "Standard", amount: 1500 }],
      });
    const adapter = new HttpShippingAdapter();
    await expect(adapter.getCheckoutSettings()).resolves.toEqual({
      status: "ok",
      value: { baseFee: 500 },
    });
    await expect(adapter.listShippingQuotes("BOG")).resolves.toEqual({
      status: "ok",
      value: [{ id: "m1", code: "STD", name: "Standard", amount: 1500 }],
    });
    expect(get).toHaveBeenLastCalledWith("/shipping-methods", {
      query: { city: "BOG" },
      signal: undefined,
    });
  });

  it("creates, pays, syncs, and reads transactions", async () => {
    const txn = { id: "tx-1", status: "PENDING" };
    post
      .mockResolvedValueOnce({ ok: true, data: txn })
      .mockResolvedValueOnce({ ok: true, data: { ...txn, status: "APPROVED" } })
      .mockResolvedValueOnce({ ok: true, data: { ...txn, status: "APPROVED" } });
    get
      .mockResolvedValueOnce({
        ok: true,
        data: {
          publicKey: "pub",
          amountInCents: 100,
          currency: "COP",
          reference: "tx-1",
          signature: "sig",
        },
      })
      .mockResolvedValueOnce({ ok: true, data: txn });

    const adapter = new HttpTransactionAdapter();

    await expect(
      adapter.createTransaction({} as never),
    ).resolves.toMatchObject({ status: "ok", value: txn });
    expect(post).toHaveBeenNthCalledWith(1, "/transactions", {}, {
      signal: undefined,
    });

    await expect(
      adapter.payTransaction(
        "tx-1",
        { paymentMethodToken: "tok" } as never,
        "idem-1",
      ),
    ).resolves.toMatchObject({ status: "ok" });
    expect(post).toHaveBeenNthCalledWith(
      2,
      "/transactions/tx-1/pay",
      { paymentMethodToken: "tok" },
      {
        headers: { "Idempotency-Key": "idem-1" },
        signal: undefined,
      },
    );

    await expect(adapter.getWidgetSession("tx-1")).resolves.toMatchObject({
      status: "ok",
    });
    expect(get).toHaveBeenCalledWith("/transactions/tx-1/widget-session", {
      signal: undefined,
    });

    await expect(
      adapter.syncProviderPayment(
        "tx-1",
        { providerTransactionId: "wompi_1" },
        "idem-sync",
      ),
    ).resolves.toMatchObject({ status: "ok" });
    expect(post).toHaveBeenNthCalledWith(
      3,
      "/transactions/tx-1/sync",
      { providerTransactionId: "wompi_1" },
      {
        headers: { "Idempotency-Key": "idem-sync" },
        signal: undefined,
      },
    );

    await expect(adapter.getTransaction("tx-1")).resolves.toMatchObject({
      status: "ok",
      value: txn,
    });
  });

  it("maps api failures through toScreenResult", async () => {
    post.mockResolvedValueOnce({
      ok: false,
      error: { kind: "api", code: "OUT_OF_STOCK", message: "gone" },
    });
    const adapter = new HttpTransactionAdapter();
    await expect(
      adapter.payTransaction("tx-1", {} as never, "idem"),
    ).resolves.toEqual({ status: "out_of_stock" });
  });
});
