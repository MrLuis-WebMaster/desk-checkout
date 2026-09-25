import { NestSettlementLogger } from "./nest-settlement-logger";

describe("NestSettlementLogger", () => {
  it("logs structured settlement events", () => {
    const logger = new NestSettlementLogger();
    expect(() => logger.log("settle_outcome", { status: "APPROVED" })).not.toThrow();
  });
});
