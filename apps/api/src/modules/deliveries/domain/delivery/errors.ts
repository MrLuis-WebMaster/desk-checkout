export class DeliveryNotFoundError {
  readonly code = "DELIVERY_NOT_FOUND" as const;

  constructor(readonly deliveryId: string) {}
}
