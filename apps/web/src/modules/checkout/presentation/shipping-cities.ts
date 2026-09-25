import {
  SHIPPING_CITY_CODES,
  type ShippingCityCode,
} from "@checkout/contracts";

export { SHIPPING_CITY_CODES };
export type { ShippingCityCode };

export const SHIPPING_CITY_LABELS: Record<ShippingCityCode, string> = {
  BOG: "Bogotá",
  MED: "Medellín",
  CALI: "Cali",
  OTHER: "Other cities",
};
