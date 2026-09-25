import { Injectable } from "@nestjs/common";
import type {
  CreateDeliveryRequest,
  DeliveryDto,
} from "@checkout/contracts";
import { err, ok, type Result } from "#shared/result/result.js";
import { FeeCatalog } from "#modules/shipping/application/ports/fee-catalog.port.js";
import { ShippingMethodNotFoundError } from "#modules/shipping/domain/fee/errors.js";
import { DeliveryRepository } from "../ports/delivery-repository.port.js";

type CreateDeliveryError = ShippingMethodNotFoundError;

@Injectable()
export class CreateDeliveryUseCase {
  constructor(
    private readonly deliveries: DeliveryRepository,
    private readonly feeCatalog: FeeCatalog,
  ) {}

  async execute(
    request: CreateDeliveryRequest,
  ): Promise<Result<DeliveryDto, CreateDeliveryError>> {
    const rate = await this.feeCatalog.getRate(
      request.shippingMethodId,
      request.city,
    );
    if (!rate.methodFound) {
      return err(new ShippingMethodNotFoundError(request.shippingMethodId));
    }
    return ok(await this.deliveries.save(request));
  }
}
