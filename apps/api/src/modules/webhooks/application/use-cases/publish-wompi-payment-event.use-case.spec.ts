import {
  PAYMENT_STATUS_CHANGED_TYPE,
  TransactionStatus,
} from "@checkout/contracts";
import { PublishWompiPaymentEventUseCase } from "./publish-wompi-payment-event.use-case.js";

describe("PublishWompiPaymentEventUseCase", () => {
  it("publishes a versioned payment.status.changed event", async () => {
    const publisher = {
      publishPaymentStatusChanged: jest.fn().mockResolvedValue(undefined),
    };
    const useCase = new PublishWompiPaymentEventUseCase(publisher as never);
    await useCase.execute({
      providerId: "wompi_1",
      status: TransactionStatus.Approved,
      reference: "tx-1",
      amountInCents: 500,
    });
    expect(publisher.publishPaymentStatusChanged).toHaveBeenCalledWith(
      expect.objectContaining({
        type: PAYMENT_STATUS_CHANGED_TYPE,
        version: 1,
        data: {
          providerId: "wompi_1",
          status: TransactionStatus.Approved,
          reference: "tx-1",
          amountInCents: 500,
        },
      }),
    );
  });
});
