import { SHIPPING_CITY_CODES } from "@checkout/contracts";
import { z } from "zod";

export const customerDeliverySchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Enter your full name.")
    .max(120, "Full name is too long."),
  email: z
    .string()
    .trim()
    .min(1, "Enter your email.")
    .email("Enter a valid email address."),
  phone: z
    .string()
    .trim()
    .min(7, "Enter a valid phone number.")
    .max(20, "Phone number is too long.")
    .regex(/^[\d+\s()-]+$/, "Enter a valid phone number."),
  addressLine: z
    .string()
    .trim()
    .min(1, "Enter your street address.")
    .max(200, "Address is too long."),
  city: z.enum(SHIPPING_CITY_CODES, {
    error: "Choose a city.",
  }),
  shippingMethodId: z
    .string()
    .trim()
    .min(1, "Choose a shipping method."),
});

export type CustomerDeliveryValues = z.infer<typeof customerDeliverySchema>;
