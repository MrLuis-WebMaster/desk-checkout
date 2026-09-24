import type { FeeCatalog } from "../ports/fee-catalog.port.js";
import { GetCheckoutSettingsUseCase } from "./get-checkout-settings.use-case.js";
import { ListShippingQuotesUseCase } from "./list-shipping-quotes.use-case.js";

describe("shipping use cases", () => {
  const feeCatalog = {
    getBaseFee: jest.fn(),
    getRate: jest.fn(),
    listQuotes: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("lists quotes returned by the fee catalog", async () => {
    const quotes = [
      { id: "method-1", code: "standard", name: "Standard", amountCents: 8000 },
    ];
    feeCatalog.listQuotes.mockResolvedValue(quotes);
    const useCase = new ListShippingQuotesUseCase(
      feeCatalog as FeeCatalog,
    );
    await expect(useCase.execute("BOG")).resolves.toEqual({
      ok: true,
      value: quotes,
    });
  });

  it("returns checkout settings when base fee exists", async () => {
    feeCatalog.getBaseFee.mockResolvedValue(5000);
    const useCase = new GetCheckoutSettingsUseCase(
      feeCatalog as FeeCatalog,
    );
    await expect(useCase.execute()).resolves.toEqual({
      ok: true,
      value: { baseFeeCents: 5000 },
    });
  });

  it("fails closed when the base fee is missing", async () => {
    feeCatalog.getBaseFee.mockResolvedValue(null);
    const useCase = new GetCheckoutSettingsUseCase(
      feeCatalog as FeeCatalog,
    );
    const result = await useCase.execute();
    expect(result).toMatchObject({
      ok: false,
      error: { code: "CHECKOUT_SETTINGS_NOT_FOUND" },
    });
  });
});
