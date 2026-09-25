import type { RouteRecordInfo } from "vue-router";
import { createRouter, createWebHistory } from "vue-router";
import NotFoundPage from "@/app/pages/NotFoundPage.vue";
import ProductListPage from "@/modules/catalog/presentation/pages/ProductListPage.vue";
import ProductPage from "@/modules/catalog/presentation/pages/ProductPage.vue";
import CheckoutPage from "@/modules/checkout/presentation/pages/CheckoutPage.vue";
import CheckoutResultPage from "@/modules/checkout/presentation/pages/CheckoutResultPage.vue";

export const routeNames = {
  productList: "productList",
  product: "product",
  checkout: "checkout",
  checkoutResult: "checkoutResult",
  notFound: "notFound",
} as const;

export interface RouteNamedMap {
  [routeNames.productList]: RouteRecordInfo<
    typeof routeNames.productList,
    "/",
    Record<never, never>,
    Record<never, never>,
    never
  >;
  [routeNames.product]: RouteRecordInfo<
    typeof routeNames.product,
    "/products/:id",
    { id: string | number },
    { id: string },
    never
  >;
  [routeNames.checkout]: RouteRecordInfo<
    typeof routeNames.checkout,
    "/checkout",
    Record<never, never>,
    Record<never, never>,
    never
  >;
  [routeNames.checkoutResult]: RouteRecordInfo<
    typeof routeNames.checkoutResult,
    "/checkout/result/:transactionId",
    { transactionId: string | number },
    { transactionId: string },
    never
  >;
  [routeNames.notFound]: RouteRecordInfo<
    typeof routeNames.notFound,
    "/:pathMatch(.*)*",
    { pathMatch: string | string[] },
    { pathMatch: string },
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
    {
      path: "/",
      name: routeNames.productList,
      component: ProductListPage,
    },
    {
      path: "/products/:id",
      name: routeNames.product,
      component: ProductPage,
    },
    {
      path: "/checkout/result/:transactionId",
      name: routeNames.checkoutResult,
      component: CheckoutResultPage,
    },
    {
      path: "/checkout",
      name: routeNames.checkout,
      component: CheckoutPage,
    },
    {
      path: "/checkout/:id",
      redirect: { name: routeNames.checkout },
    },
    {
      path: "/:pathMatch(.*)*",
      name: routeNames.notFound,
      component: NotFoundPage,
    },
  ],
});
