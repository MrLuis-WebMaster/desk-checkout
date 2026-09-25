import { Injectable, Logger } from "@nestjs/common";
import {
  SettlementLogger,
  type SettlementLogMeta,
} from "@checkout/settlement";

@Injectable()
export class NestSettlementLogger extends SettlementLogger {
  private readonly logger = new Logger("Settlement");

  log(event: string, meta?: SettlementLogMeta): void {
    this.logger.log({ event, ...meta });
  }
}
