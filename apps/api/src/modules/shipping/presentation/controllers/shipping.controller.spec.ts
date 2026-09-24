import { Test } from "@nestjs/testing";
import { ApiErrorCode } from "@checkout/contracts";
import { err, ok } from "#shared/result/result.js";
import { GetCheckoutSettingsUseCase } from "../../application/use-cases/get-checkout-settings.use-case.js";
import { ListShippingQuotesUseCase } from "../../application/use-cases/list-shipping-quotes.use-case.js";
import { CheckoutSettingsNotFoundError } from "../../domain/fee/errors.js";
import { ShippingController } from "./shipping.controller.js";

describe("ShippingController", () => {
  const listShippingQuotes = { execute: jest.fn() };
  const getCheckoutSettings = { execute: jest.fn() };
  let controller: ShippingController;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ShippingController],
      providers: [
        { provide: ListShippingQuotesUseCase, useValue: listShippingQuotes },
        { provide: GetCheckoutSettingsUseCase, useValue: getCheckoutSettings },
      ],
    }).compile();
    controller = moduleRef.get(ShippingController);
    jest.resetAllMocks();
  });

  it("returns regional shipping quotes", async () => {
    const quotes = [
      { id: "method", code: "standard", name: "Standard", amountCents: 8000 },
    ];
    listShippingQuotes.execute.mockResolvedValue(ok(quotes));
    await expect(controller.list({ region: "BOG" })).resolves.toEqual(quotes);
  });

  it("maps missing checkout settings to HTTP 503", async () => {
    getCheckoutSettings.execute.mockResolvedValue(
      err(new CheckoutSettingsNotFoundError()),
    );
    await expect(controller.settings()).rejects.toMatchObject({
      response: { code: ApiErrorCode.CheckoutSettingsNotFound },
      status: 503,
    });
  });
});
