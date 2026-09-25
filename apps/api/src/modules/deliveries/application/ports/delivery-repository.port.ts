import type { CreateDeliveryRequest, DeliveryDto } from "@checkout/contracts";

export abstract class DeliveryRepository {
  abstract save(input: CreateDeliveryRequest): Promise<DeliveryDto>;
  abstract findById(id: string): Promise<DeliveryDto | null>;
}
