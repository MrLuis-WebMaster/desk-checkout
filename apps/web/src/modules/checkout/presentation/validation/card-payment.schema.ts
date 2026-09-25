import { z } from "zod";
import {
  detectCardBrand,
  digitsOnly,
  expectedCardLength,
  expectedCvcLength,
  luhnCheck,
} from "@/modules/checkout/infrastructure/card-number";

function isValidExpiry(month: string, year: string): boolean {
  const monthNum = Number(month);
  const yearNum = Number(year);
  if (
    !Number.isInteger(monthNum) ||
    !Number.isInteger(yearNum) ||
    monthNum < 1 ||
    monthNum > 12
  ) {
    return false;
  }
  const now = new Date();
  const currentYear = now.getFullYear() % 100;
  const currentMonth = now.getMonth() + 1;
  if (yearNum < currentYear) {
    return false;
  }
  if (yearNum === currentYear && monthNum < currentMonth) {
    return false;
  }
  return true;
}

export const cardPaymentSchema = z
  .object({
    cardHolder: z
      .string()
      .trim()
      .min(1, "Enter the name on the card.")
      .max(80, "Cardholder name is too long."),
    cardNumber: z.string().trim().min(1, "Enter your card number."),
    expMonth: z
      .string()
      .trim()
      .regex(/^(0[1-9]|1[0-2])$/, "Enter a valid month (01–12)."),
    expYear: z
      .string()
      .trim()
      .regex(/^\d{2}$/, "Enter a two-digit year."),
    cvc: z.string().trim().min(1, "Enter the CVC."),
    installments: z.coerce
      .string()
      .trim()
      .regex(/^[1-9]\d?$/, "Enter installments between 1 and 36.")
      .refine((value) => {
        const n = Number(value);
        return n >= 1 && n <= 36;
      }, "Enter installments between 1 and 36."),
    accepted: z.boolean().refine((value) => value === true, {
      message: "Accept Wompi's terms to continue.",
    }),
  })
  .superRefine((values, ctx) => {
    const digits = digitsOnly(values.cardNumber);
    const brand = detectCardBrand(digits);
    const expectedLength = expectedCardLength(brand);

    if (digits.length > 0) {
      if (digits.length < expectedLength) {
        ctx.addIssue({
          code: "custom",
          path: ["cardNumber"],
          message: "Card number is incomplete.",
        });
      } else if (digits.length > expectedLength || brand === "unknown") {
        ctx.addIssue({
          code: "custom",
          path: ["cardNumber"],
          message: "Enter a valid Visa, Mastercard, or Amex number.",
        });
      } else if (!luhnCheck(digits)) {
        ctx.addIssue({
          code: "custom",
          path: ["cardNumber"],
          message: "Card number is invalid.",
        });
      }
    }

    const cvcDigits = digitsOnly(values.cvc);
    const cvcLength = expectedCvcLength(brand === "unknown" ? "visa" : brand);
    if (cvcDigits.length > 0) {
      if (!/^\d+$/.test(cvcDigits)) {
        ctx.addIssue({
          code: "custom",
          path: ["cvc"],
          message: "Enter a valid CVC.",
        });
      } else if (cvcDigits.length !== cvcLength) {
        ctx.addIssue({
          code: "custom",
          path: ["cvc"],
          message:
            brand === "amex"
              ? "Amex CVC must be 4 digits."
              : "CVC must be 3 digits.",
        });
      }
    }

    if (
      /^(0[1-9]|1[0-2])$/.test(values.expMonth) &&
      /^\d{2}$/.test(values.expYear) &&
      !isValidExpiry(values.expMonth, values.expYear)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["expMonth"],
        message: "Card has expired.",
      });
    }
  });

export type CardPaymentValues = z.infer<typeof cardPaymentSchema>;
