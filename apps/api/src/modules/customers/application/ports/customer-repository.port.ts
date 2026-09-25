import type { CreateCustomerRequest, CustomerDto } from "@checkout/contracts";

export abstract class CustomerRepository {
  abstract save(input: CreateCustomerRequest): Promise<CustomerDto>;
  abstract findById(id: string): Promise<CustomerDto | null>;
}
