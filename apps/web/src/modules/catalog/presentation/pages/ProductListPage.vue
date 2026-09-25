<script setup lang="ts">
import { computed, onScopeDispose, ref, watch } from "vue";
import { Check, Plus } from "@lucide/vue";
import {
  PRODUCT_LIST_OFFSET_PAGE_MAX,
  type ProductOrder,
  type ProductSort,
} from "@checkout/contracts";
import CatalogPager from "@/modules/catalog/presentation/components/CatalogPager.vue";
import { routeNames } from "@/app/router";
import { useAddToCart } from "@/modules/checkout/presentation/composables/use-add-to-cart";
import { useProductList } from "@/modules/catalog/presentation/composables/use-product-list";
import { useProductListQuery } from "@/modules/catalog/presentation/composables/use-product-list-query";
import { formatCop } from "@/shared/presentation/format-cop";
import {
  UiAlert,
  UiButton,
  UiEmpty,
  UiFilterLozenge,
  UiIconButton,
  UiInput,
  UiProductImage,
  UiSelect,
  UiSkeleton,
} from "@/shared/ui";

const { add: addProduct, isAdded } = useAddToCart();

const SORT_PRESETS: ReadonlyArray<{
  id: string;
  sort: ProductSort;
  order: ProductOrder;
  label: string;
}> = [
  {
    id: "name-asc",
    sort: "name",
    order: "asc",
    label: "Name, A to Z",
  },
  {
    id: "name-desc",
    sort: "name",
    order: "desc",
    label: "Name, Z to A",
  },
  {
    id: "price-asc",
    sort: "price",
    order: "asc",
    label: "Price, low to high",
  },
  {
    id: "price-desc",
    sort: "price",
    order: "desc",
    label: "Price, high to low",
  },
];

const DEFAULT_PRESET = SORT_PRESETS[0];

const { query, setSearch, setListing, clearFilters, goToPage, idsMode } =
  useProductListQuery();
const { items, total, loading, errorMessage } = useProductList(query);

const searchInput = ref(query.value.q ?? "");
let searchTimer = 0;

onScopeDispose(() => {
  window.clearTimeout(searchTimer);
});

const presetId = computed(() => {
  const match = SORT_PRESETS.find(
    (preset) =>
      preset.sort === query.value.sort && preset.order === query.value.order,
  );
  return match?.id ?? DEFAULT_PRESET.id;
});

const presetModel = computed({
  get: () => presetId.value,
  set: (id: string) => {
    const preset =
      SORT_PRESETS.find((item) => item.id === id) ?? DEFAULT_PRESET;
    setListing({ sort: preset.sort, order: preset.order });
  },
});

const appliedSearch = computed(() => query.value.q ?? "");
const appliedPreset = computed(
  () => SORT_PRESETS.find((preset) => preset.id === presetId.value) ?? DEFAULT_PRESET,
);
const sortIsActive = computed(() => appliedPreset.value.id !== DEFAULT_PRESET.id);
const hasFilters = computed(
  () =>
    appliedSearch.value.length > 0 ||
    sortIsActive.value ||
    idsMode.value,
);
const resultLabel = computed(() =>
  total.value === 1 ? "1 product" : `${total.value} products`,
);
const currentPage = computed(() => query.value.page ?? 1);
const pageCount = computed(() => {
  if (idsMode.value || total.value === 0) {
    return 0;
  }
  return Math.min(
    Math.ceil(total.value / query.value.pageSize),
    PRODUCT_LIST_OFFSET_PAGE_MAX,
  );
});
const showPagination = computed(
  () => !idsMode.value && !loading.value && pageCount.value > 1,
);
const canGoPrev = computed(() => currentPage.value > 1);
const canGoNext = computed(
  () => pageCount.value > 0 && currentPage.value < pageCount.value,
);
const pageDraft = ref("1");

watch(
  () => query.value.q,
  (q) => {
    const next = q ?? "";
    if (searchInput.value !== next) {
      searchInput.value = next;
    }
  },
);

watch(searchInput, (value) => {
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(() => {
    if ((query.value.q ?? "") !== value.trim()) {
      setSearch(value.trim());
    }
  }, 300);
});

function onSearchSubmit() {
  window.clearTimeout(searchTimer);
  setSearch(searchInput.value.trim());
}

function clearSearch() {
  window.clearTimeout(searchTimer);
  searchInput.value = "";
  setSearch("");
}

function clearSort() {
  setListing({ sort: DEFAULT_PRESET.sort, order: DEFAULT_PRESET.order });
}

function onClearAll() {
  window.clearTimeout(searchTimer);
  searchInput.value = "";
  clearFilters();
}

watch(
  currentPage,
  (value) => {
    pageDraft.value = String(value);
  },
  { immediate: true },
);

watch([currentPage, pageCount], () => {
  if (pageCount.value > 0 && currentPage.value > pageCount.value) {
    goToPage(pageCount.value);
  }
});

function jumpToDraft() {
  const next = Number(pageDraft.value);
  if (!Number.isInteger(next) || next < 1 || pageCount.value < 1) {
    pageDraft.value = String(currentPage.value);
    return;
  }
  goToPage(Math.min(next, pageCount.value));
}

function goPrev() {
  if (currentPage.value > 1) {
    goToPage(currentPage.value - 1);
  }
}

function goNext() {
  if (currentPage.value < pageCount.value) {
    goToPage(currentPage.value + 1);
  }
}
</script>

<template>
  <main>
    <div class="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <h1 class="text-2xl font-semibold tracking-tight">Products</h1>
      <p
        v-if="!loading && !errorMessage"
        class="text-sm text-muted"
        aria-live="polite"
      >
        {{ resultLabel }}
      </p>
    </div>

    <form
      class="mt-5 grid gap-4 sm:grid-cols-[minmax(0,36rem)_16rem] sm:items-end"
      @submit.prevent="onSearchSubmit"
    >
      <div class="grid min-w-0 gap-1.5">
        <label for="product-search" class="text-sm font-medium">Name</label>
        <UiInput
          id="product-search"
          v-model="searchInput"
          type="search"
          :maxlength="100"
          placeholder="Search by name"
          autocomplete="off"
        />
      </div>
      <div class="grid min-w-0 gap-1.5">
        <label for="product-sort" class="text-sm font-medium">Sort</label>
        <UiSelect id="product-sort" v-model="presetModel">
          <option v-for="preset in SORT_PRESETS" :key="preset.id" :value="preset.id">
            {{ preset.label }}
          </option>
        </UiSelect>
      </div>
    </form>

    <div v-if="hasFilters" class="mt-3 flex flex-wrap items-center gap-2">
      <UiFilterLozenge
        v-if="idsMode"
        identifier="Order"
        value="Purchased products"
        remove-label="Show full catalog"
        @remove="onClearAll"
      />
      <UiFilterLozenge
        v-if="appliedSearch"
        identifier="Name"
        :value="appliedSearch"
        remove-label="Remove name filter"
        @remove="clearSearch"
      />
      <UiFilterLozenge
        v-if="sortIsActive"
        identifier="Sort"
        :value="appliedPreset.label"
        remove-label="Remove sort filter"
        @remove="clearSort"
      />
      <UiButton variant="ghost" @click="onClearAll">Clear all</UiButton>
    </div>

    <CatalogPager
      v-if="showPagination"
      v-model:page-draft="pageDraft"
      class="mt-6"
      :page-count="pageCount"
      :can-go-prev="canGoPrev"
      :can-go-next="canGoNext"
      @jump="jumpToDraft"
      @prev="goPrev"
      @next="goNext"
    />

    <div class="mt-6">
      <div
        v-if="loading"
        class="grid grid-cols-2 gap-x-3 gap-y-8 lg:grid-cols-3 lg:gap-x-4"
        aria-busy="true"
        aria-live="polite"
      >
        <span class="sr-only">Loading products</span>
        <div v-for="row in 6" :key="row">
          <UiSkeleton class="aspect-[3/4] w-full" />
          <UiSkeleton class="mt-2 h-4 w-2/3" />
          <UiSkeleton class="mt-1 h-4 w-1/3" />
        </div>
      </div>

      <UiAlert v-else-if="errorMessage">{{ errorMessage }}</UiAlert>

      <UiEmpty
        v-else-if="items.length === 0"
        :title="hasFilters ? 'No products match' : 'No products found'"
      >
        {{
          hasFilters
            ? "Nothing in the catalog fits these filters."
            : "The catalog is empty."
        }}
        <template v-if="hasFilters" #action>
          <UiButton variant="secondary" @click="onClearAll">Clear all</UiButton>
        </template>
      </UiEmpty>

      <ul
        v-else
        class="grid grid-cols-2 gap-x-3 gap-y-8 lg:grid-cols-3 lg:gap-x-4"
      >
        <li v-for="product in items" :key="product.id" class="group">
          <RouterLink
            :to="{ name: routeNames.product, params: { id: product.id } }"
            class="block"
          >
            <span class="block overflow-hidden bg-sunken">
              <UiProductImage
                :src="product.imageUrl"
                :alt="product.name"
                width="800"
                height="1066"
                class="aspect-[3/4] w-full object-cover transition-transform duration-200 ease-out-quart group-hover:scale-[1.03]"
              />
            </span>
          </RouterLink>
          <div class="mt-2 flex items-center justify-between gap-2">
            <RouterLink
              :to="{ name: routeNames.product, params: { id: product.id } }"
              class="min-w-0"
            >
              <span class="block truncate text-sm">{{ product.name }}</span>
              <span class="mt-0.5 block text-sm font-semibold tabular-nums">
                {{ formatCop(product.price) }}
              </span>
            </RouterLink>
            <UiIconButton
              :icon="isAdded(product.id) ? Check : Plus"
              :size="18"
              :class="
                isAdded(product.id) ? 'animate-add-pop bg-ink text-paper' : ''
              "
              :disabled="product.availableStock < 1"
              :label="`Add ${product.name} to cart`"
              @click="addProduct(product)"
            />
          </div>
        </li>
      </ul>
    </div>

    <CatalogPager
      v-if="showPagination"
      v-model:page-draft="pageDraft"
      class="mt-8"
      :page-count="pageCount"
      :can-go-prev="canGoPrev"
      :can-go-next="canGoNext"
      @jump="jumpToDraft"
      @prev="goPrev"
      @next="goNext"
    />
  </main>
</template>
