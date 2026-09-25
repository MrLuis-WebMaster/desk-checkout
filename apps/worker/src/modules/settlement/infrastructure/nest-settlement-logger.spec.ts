import { Logger } from "@nestjs/common";
import { NestSettlementLogger } from "./nest-settlement-logger";

describe("NestSettlementLogger", () => {
  it("logs structured settlement events", () => {
    const spy = jest.spyOn(Logger.prototype, "log").mockImplementation();
    const logger = new NestSettlementLogger();

    logger.log("settle_outcome", { status: "APPROVED", transactionId: "tx-1" });

    expect(spy).toHaveBeenCalledWith({
      event: "settle_outcome",
      status: "APPROVED",
      transactionId: "tx-1",
    });
    spy.mockRestore();
  });
});
