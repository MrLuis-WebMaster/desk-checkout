import { createRouter, createWebHistory } from "vue-router";
import ProductPage from "./modules/catalog/presentation/ProductPage.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", redirect: "/products/headphones" },
    { path: "/products/:id", component: ProductPage },
  ],
});
