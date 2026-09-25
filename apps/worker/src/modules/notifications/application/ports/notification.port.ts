export abstract class NotificationPort {
  abstract sendOrderConfirmed(input: {
    transactionId: string;
    customerId: string;
  }): Promise<void>;
}
