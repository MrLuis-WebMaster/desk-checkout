import { beforeEach, describe, expect, it, vi } from "vitest";
import { useWompiWidget } from "./use-wompi-widget";

const { getWidgetSession, openWompiWidgetCheckout, push } = vi.hoisted(() => ({
  getWidgetSession: vi.fn(),
  openWompiWidgetCheckout: vi.fn(),
  push: vi.fn(),
}));

vi.mock("vue-router", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/app/router", () => ({
  routeNames: { checkoutResult: "checkout-result" },
}));

vi.mock("@/modules/checkout/composition", () => ({
  getWidgetSession: (...args: unknown[]) => getWidgetSession(...args),
  openWompiWidgetCheckout: (...args: unknown[]) =>
    openWompiWidgetCheckout(...args),
}));

describe("useWompiWidget", () => {
  beforeEach(() => {
    getWidgetSession.mockReset();
    openWompiWidgetCheckout.mockReset();
    push.mockReset();
  });

  it("opens the widget and routes to the result page on completion", async () => {
    getWidgetSession.mockResolvedValue({
      status: "ok",
      value: {
        currency: "COP",
        amountInCents: 1_200_000,
        reference: "tx-1",
        publicKey: "pub",
        signature: "sig",
      },
    });
    openWompiWidgetCheckout.mockImplementation(async (_config, onComplete) => {
      onComplete?.({ transaction: { id: "wompi_1" } });
    });

    const widget = useWompiWidget({
      transactionId: () => "tx-1",
      redirectUrl: () => "https://shop.example/result",
      customerEmail: () => "ada@example.com",
      customerFullName: () => "Ada",
      customerPhone: () => "300",
    });

    await widget.openWidget();

    expect(openWompiWidgetCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        publicKey: "pub",
        redirectUrl: "https://shop.example/result",
        customerData: expect.objectContaining({
          email: "ada@example.com",
          phoneNumberPrefix: "+57",
        }),
      }),
      expect.any(Function),
    );
    expect(push).toHaveBeenCalledWith({
      name: "checkout-result",
      params: { transactionId: "tx-1" },
      query: { id: "wompi_1" },
    });
    expect(widget.loading.value).toBe(false);
  });

  it("drops non-https redirect urls", async () => {
    getWidgetSession.mockResolvedValue({
      status: "ok",
      value: {
        currency: "COP",
        amountInCents: 100,
        reference: "tx-1",
        publicKey: "pub",
        signature: "sig",
      },
    });
    openWompiWidgetCheckout.mockResolvedValue(undefined);

    const widget = useWompiWidget({
      transactionId: () => "tx-1",
      redirectUrl: () => "http://localhost:5173/result",
    });
    await widget.openWidget();

    expect(openWompiWidgetCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ redirectUrl: undefined }),
      expect.any(Function),
    );
  });

  it("surfaces session failures", async () => {
    getWidgetSession.mockResolvedValue({ status: "not_found" });

    const widget = useWompiWidget({
      transactionId: () => "tx-1",
      redirectUrl: () => "https://shop.example/result",
    });
    await widget.openWidget();

    expect(widget.errorMessage.value).toMatch(/no longer available/i);
    expect(openWompiWidgetCheckout).not.toHaveBeenCalled();
  });

  it("surfaces widget open failures", async () => {
    getWidgetSession.mockResolvedValue({
      status: "ok",
      value: {
        currency: "COP",
        amountInCents: 100,
        reference: "tx-1",
        publicKey: "pub",
        signature: "sig",
      },
    });
    openWompiWidgetCheckout.mockRejectedValue(new Error("blocked"));

    const widget = useWompiWidget({
      transactionId: () => "tx-1",
      redirectUrl: () => "https://shop.example/result",
    });
    await widget.openWidget();

    expect(widget.errorMessage.value).toMatch(/Couldn't open Wompi/i);
  });
});
