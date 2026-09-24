import type { RouteRecordInfo } from "vue-router";
import { createRouter, createWebHistory } from "vue-router";
import ProductPage from "@/modules/catalog/presentation/ProductPage.vue";

export const routeNames = {
  product: "product",
} as const;

export interface RouteNamedMap {
  [routeNames.product]: RouteRecordInfo<
    typeof routeNames.product,
    "/products/:id",
    { id: string | number },
    { id: string },
    never
  >;
}

declare module "vue-router" {
  interface TypesConfig {
    RouteNamedMap: RouteNamedMap;
  }
}

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", redirect: "/products/headphones" },
    { path: "/products/:id", name: routeNames.product, component: ProductPage },
  ],
});
