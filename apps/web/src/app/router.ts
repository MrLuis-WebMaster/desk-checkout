import type { RouteRecordInfo } from "vue-router";
import { createRouter, createWebHistory } from "vue-router";
import NotFoundPage from "@/app/pages/NotFoundPage.vue";
import ProductListPage from "@/modules/catalog/presentation/pages/ProductListPage.vue";
import ProductPage from "@/modules/catalog/presentation/pages/ProductPage.vue";
import CheckoutPage from "@/modules/checkout/presentation/pages/CheckoutPage.vue";

export const routeNames = {
  productList: "productList",
  product: "product",
  checkout: "checkout",
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
    "/checkout/:id",
    { id: string | number },
    { id: string },
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
      path: "/checkout/:id",
      name: routeNames.checkout,
      component: CheckoutPage,
    },
    {
      path: "/:pathMatch(.*)*",
      name: routeNames.notFound,
      component: NotFoundPage,
    },
  ],
});
