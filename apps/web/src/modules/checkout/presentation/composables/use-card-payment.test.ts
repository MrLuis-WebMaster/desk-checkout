import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { TransactionStatus } from "@checkout/contracts";
import { useCardPayment } from "./use-card-payment";

const { tokenizeWompiCard, payTransaction, finalizeCheckout, onPaid } =
  vi.hoisted(() => ({
    tokenizeWompiCard: vi.fn(),
    payTransaction: vi.fn(),
    finalizeCheckout: vi.fn(),
    onPaid: vi.fn(),
  }));

vi.mock("vee-validate", () => ({
  useForm: () => {
    const values = {
      cardHolder: "Ada Lovelace",
      cardNumber: "4242 4242 4242 4242",
      expMonth: "12",
      expYear: "30",
      cvc: "123",
      installments: "1",
      accepted: true,
    };
    return {
      defineField: (name: keyof typeof values) => [ref(values[name])],
      handleSubmit:
        (fn: (v: typeof values) => Promise<void>) =>
        async () => {
          await fn(values);
        },
      errors: ref({}),
      setFieldValue: vi.fn(),
    };
  },
}));

vi.mock("@/modules/checkout/composition", () => ({
  tokenizeWompiCard: (...args: unknown[]) => tokenizeWompiCard(...args),
  payTransaction: (...args: unknown[]) => payTransaction(...args),
  newIdempotencyKey: () => "idem-card",
}));

vi.mock("@/modules/checkout/presentation/composables/finalize-checkout", () => ({
  finalizeCheckout: (...args: unknown[]) => finalizeCheckout(...args),
}));

describe("useCardPayment", () => {
  const paymentConfig = {
    publicKey: "pub_test",
    acceptanceToken: "acc",
    acceptPersonalAuth: "pda",
  };

  beforeEach(() => {
    tokenizeWompiCard.mockReset();
    payTransaction.mockReset();
    finalizeCheckout.mockReset();
    onPaid.mockReset();
  });

  it("tokenizes, pays, finalizes, and notifies on approval", async () => {
    tokenizeWompiCard.mockResolvedValue({ ok: true, token: "tok_1" });
    payTransaction.mockResolvedValue({
      status: "ok",
      value: { id: "tx-1", status: TransactionStatus.Approved },
    });

    const card = useCardPayment({
      transactionId: () => "tx-1",
      paymentConfig: () => paymentConfig as never,
      onPaid,
    });

    await card.onSubmit();

    expect(tokenizeWompiCard).toHaveBeenCalledWith("pub_test", {
      number: "4242424242424242",
      cvc: "123",
      expMonth: "12",
      expYear: "30",
      cardHolder: "Ada Lovelace",
    });
    expect(payTransaction).toHaveBeenCalledWith(
      "tx-1",
      {
        paymentMethodToken: "tok_1",
        acceptanceToken: "acc",
        acceptPersonalAuth: "pda",
        installments: 1,
      },
      "idem-card",
    );
    expect(finalizeCheckout).toHaveBeenCalledWith(TransactionStatus.Approved);
    expect(onPaid).toHaveBeenCalled();
    expect(card.errorMessage.value).toBe("");
    expect(card.loading.value).toBe(false);
  });

  it("surfaces tokenize failures without charging", async () => {
    tokenizeWompiCard.mockResolvedValue({
      ok: false,
      message: "Invalid card",
    });

    const card = useCardPayment({
      transactionId: () => "tx-1",
      paymentConfig: () => paymentConfig as never,
      onPaid,
    });
    await card.onSubmit();

    expect(payTransaction).not.toHaveBeenCalled();
    expect(card.errorMessage.value).toBe("Invalid card");
  });

  it("maps post-charge out of stock without retrying", async () => {
    tokenizeWompiCard.mockResolvedValue({ ok: true, token: "tok_1" });
    payTransaction.mockResolvedValue({ status: "out_of_stock" });

    const card = useCardPayment({
      transactionId: () => "tx-1",
      paymentConfig: () => paymentConfig as never,
      onPaid,
    });
    await card.onSubmit();

    expect(card.errorMessage.value).toMatch(/tx-1/);
    expect(onPaid).not.toHaveBeenCalled();
  });

  it("shows a bank-declined message", async () => {
    tokenizeWompiCard.mockResolvedValue({ ok: true, token: "tok_1" });
    payTransaction.mockResolvedValue({
      status: "ok",
      value: { id: "tx-1", status: TransactionStatus.Declined },
    });

    const card = useCardPayment({
      transactionId: () => "tx-1",
      paymentConfig: () => paymentConfig as never,
      onPaid,
    });
    await card.onSubmit();

    expect(finalizeCheckout).toHaveBeenCalledWith(TransactionStatus.Declined);
    expect(card.errorMessage.value).toMatch(/declined/i);
    expect(onPaid).not.toHaveBeenCalled();
  });
});
