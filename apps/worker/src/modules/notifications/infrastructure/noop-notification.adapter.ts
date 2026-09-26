import { NotificationPort } from "../application/ports/notification.port.js";

/** Extension point for a real provider (email, SMS, etc.). */
export class NoopNotificationAdapter extends NotificationPort {
  async sendOrderConfirmed(_input: {
    transactionId: string;
    customerId: string;
  }): Promise<void> {
    // Intentionally empty — demonstrates the post-purchase extension surface.
  }
}
