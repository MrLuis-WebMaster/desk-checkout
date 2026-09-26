import { beforeEach, describe, expect, it, vi } from "vitest";
import { TransactionStatus } from "@checkout/contracts";
import { postChargeOutOfStockMessage } from "@/shared/application/messages/stock-messages";

const getTransaction = vi.fn();
const syncProviderPayment = vi.fn();
const finalizeCheckout = vi.fn();
const push = vi.fn();
const routeState = {
  params: { transactionId: "tx-1" } as Record<string, string>,
  query: {} as Record<string, string>,
};

vi.mock("vue", async () => {
  const actual = await vi.importActual<typeof import("vue")>("vue");
  return {
    ...actual,
    onMounted: (cb: () => void) => {
      void cb();
    },
  };
});

vi.mock("vue-router", () => ({
  useRoute: () => routeState,
  useRouter: () => ({ push }),
}));

vi.mock("@/modules/checkout/composition", () => ({
  getTransaction: (...args: unknown[]) => getTransaction(...args),
  syncProviderPayment: (...args: unknown[]) => syncProviderPayment(...args),
  newIdempotencyKey: () => "idem-1",
}));

vi.mock("@/modules/checkout/presentation/composables/finalize-checkout", () => ({
  finalizeCheckout: (...args: unknown[]) => finalizeCheckout(...args),
}));

vi.mock("@/app/router", () => ({
  routeNames: {
    productList: "productList",
    product: "product",
    checkout: "checkout",
  },
}));

function transaction(status: TransactionStatus) {
  return {
    id: "tx-1",
    status,
    productId: "p1",
    productName: "Lamp",
    productPrice: 10000,
    quantity: 1,
    lines: [
      {
        productId: "p1",
        productName: "Lamp",
        productPrice: 10000,
        quantity: 1,
      },
    ],
    baseFee: 500,
    deliveryFee: 1500,
    total: 12000,
    customer: { fullName: "A", email: "a@b.c", phone: "1" },
    delivery: {
      shippingMethodId: "s1",
      addressLine: "x",
      city: "BOG",
    },
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("useCheckoutResult", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeState.params = { transactionId: "tx-1" };
    routeState.query = {};
  });

  it("applies an approved transaction and finalizes checkout", async () => {
    getTransaction.mockResolvedValue({
      status: "ok",
      value: transaction(TransactionStatus.Approved),
    });

    const { useCheckoutResult } = await import("./use-checkout-result");
    const {
      loading,
      errorMessage,
      merchandiseTotal,
      baseFee,
      deliveryFee,
      shippingCityLabel,
      total,
      view,
      purchasedCta,
    } = useCheckoutResult();
    await vi.waitFor(() => expect(loading.value).toBe(false));

    expect(errorMessage.value).toBe("");
    expect(merchandiseTotal.value).toBe(10000);
    expect(baseFee.value).toBe(500);
    expect(deliveryFee.value).toBe(1500);
    expect(shippingCityLabel.value).toBe("Bogotá");
    expect(total.value).toBe(12000);
    expect(finalizeCheckout).toHaveBeenCalledWith(TransactionStatus.Approved);
    expect(view.value?.title).toMatch(/approved/i);
    expect(view.value?.tone).toBe("ok");
    expect(purchasedCta.value).toEqual({
      label: "View purchased product",
      to: { name: "product", params: { id: "p1" } },
    });
  });

  it("builds a multi-product purchased CTA", async () => {
    const multi = transaction(TransactionStatus.Approved);
    multi.lines = [
      {
        productId: "p1",
        productName: "Lamp",
        productPrice: 10000,
        quantity: 1,
      },
      {
        productId: "p2",
        productName: "Chair",
        productPrice: 20000,
        quantity: 1,
      },
    ];
    getTransaction.mockResolvedValue({ status: "ok", value: multi });

    const { useCheckoutResult } = await import("./use-checkout-result");
    const { loading, purchasedCta } = useCheckoutResult();
    await vi.waitFor(() => expect(loading.value).toBe(false));

    expect(purchasedCta.value).toEqual({
      label: "View purchased products",
      to: { name: "productList", query: { ids: "p1,p2" } },
    });
  });

  it("keeps declined/error/pending/expired views without clearing cart policy beyond finalize", async () => {
    for (const status of [
      TransactionStatus.Declined,
      TransactionStatus.Error,
      TransactionStatus.Pending,
      TransactionStatus.Expired,
    ]) {
      getTransaction.mockResolvedValue({
        status: "ok",
        value: transaction(status),
      });
      const { useCheckoutResult } = await import("./use-checkout-result");
      const { loading, view } = useCheckoutResult();
      await vi.waitFor(() => expect(loading.value).toBe(false));
      expect(finalizeCheckout).toHaveBeenCalledWith(status);
      expect(view.value).not.toBeNull();
      finalizeCheckout.mockClear();
    }
  });

  it("surfaces post-charge OOS copy and does not finalize", async () => {
    routeState.params = { transactionId: "tx-oos" };
    routeState.query = { id: "wompi_1" };
    syncProviderPayment.mockResolvedValue({ status: "out_of_stock" });

    const { useCheckoutResult } = await import("./use-checkout-result");
    const { loading, errorMessage } = useCheckoutResult();
    await vi.waitFor(() => expect(loading.value).toBe(false));

    expect(errorMessage.value).toBe(postChargeOutOfStockMessage("tx-oos"));
    expect(finalizeCheckout).not.toHaveBeenCalled();
  });

  it("handles missing transaction id and not-found sync", async () => {
    routeState.params = { transactionId: "" };
    const { useCheckoutResult } = await import("./use-checkout-result");
    let result = useCheckoutResult();
    await vi.waitFor(() => expect(result.loading.value).toBe(false));
    expect(result.errorMessage.value).toMatch(/missing order/i);

    routeState.params = { transactionId: "tx-1" };
    routeState.query = { id: "wompi_missing" };
    syncProviderPayment.mockResolvedValue({ status: "not_found" });
    result = useCheckoutResult();
    await vi.waitFor(() => expect(result.loading.value).toBe(false));
    expect(result.errorMessage.value).toMatch(/couldn't find/i);
  });
});
