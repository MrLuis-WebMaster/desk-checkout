import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type {
  ShippingMethodQuoteDto,
  ShippingRegionCode,
} from "@checkout/contracts";
import { Repository } from "typeorm";
import {
  FeeCatalog,
  type ShippingRateLookup,
} from "../../application/ports/fee-catalog.port.js";
import { CheckoutSettingOrmEntity } from "./checkout-setting.orm-entity.js";
import { ShippingMethodOrmEntity } from "./shipping-method.orm-entity.js";
import { ShippingRateOrmEntity } from "./shipping-rate.orm-entity.js";

@Injectable()
export class TypeOrmFeeCatalog extends FeeCatalog {
  constructor(
    @InjectRepository(CheckoutSettingOrmEntity)
    private readonly settings: Repository<CheckoutSettingOrmEntity>,
    @InjectRepository(ShippingMethodOrmEntity)
    private readonly methods: Repository<ShippingMethodOrmEntity>,
    @InjectRepository(ShippingRateOrmEntity)
    private readonly rates: Repository<ShippingRateOrmEntity>,
  ) {
    super();
  }

  async getBaseFee(): Promise<number | null> {
    const setting = await this.settings.findOne({ where: { key: "base_fee" } });
    return setting?.valueCents ?? null;
  }

  async getRate(
    methodId: string,
    regionCode: ShippingRegionCode,
  ): Promise<ShippingRateLookup> {
    const method = await this.methods.findOne({
      where: { id: methodId, active: true },
    });
    if (!method) {
      return { methodFound: false, amount: null };
    }
    const rate = await this.rates.findOne({
      where: { shippingMethodId: methodId, regionCode },
    });
    return { methodFound: true, amount: rate?.amountCents ?? null };
  }

  async listQuotes(
    regionCode: ShippingRegionCode,
  ): Promise<ShippingMethodQuoteDto[]> {
    const rows = await this.methods
      .createQueryBuilder("method")
      .innerJoin(
        "shipping_rates",
        "rate",
        "rate.shipping_method_id = method.id AND rate.region_code = :regionCode",
        { regionCode },
      )
      .select([
        "method.id AS id",
        "method.code AS code",
        "method.name AS name",
        "rate.amount_cents AS \"amount\"",
      ])
      .where("method.active = true")
      .orderBy("rate.amount_cents", "ASC")
      .getRawMany<{
        id: string;
        code: string;
        name: string;
        amount: string | number;
      }>();

    return rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      amount: Number(row.amount),
    }));
  }
}
