export class CustomerNotFoundError {
  readonly code = "CUSTOMER_NOT_FOUND" as const;

  constructor(readonly customerId: string) {}
}
