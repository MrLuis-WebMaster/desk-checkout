export type SettlementLogMeta = Record<string, unknown>;

/** Structured ops logging without Nest dependency. */
export abstract class SettlementLogger {
  abstract log(event: string, meta?: SettlementLogMeta): void;
}

export class NoopSettlementLogger extends SettlementLogger {
  log(_event: string, _meta?: SettlementLogMeta): void {}
}
