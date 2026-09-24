<script setup lang="ts">
import { computed, onScopeDispose, ref, watch, type Component } from "vue";
import {
  ArrowDown01,
  ArrowDown10,
  ArrowDownAZ,
  ArrowDownZA,
  ChevronLeft,
  ChevronRight,
} from "@lucide/vue";
import {
  PRODUCT_LIST_OFFSET_PAGE_MAX,
  type ProductOrder,
  type ProductSort,
} from "@checkout/contracts";
import { routeNames } from "@/app/router";
import { useProductList } from "@/modules/catalog/presentation/composables/use-product-list";
import { useProductListQuery } from "@/modules/catalog/presentation/composables/use-product-list-query";
import {
  productImageFallback,
  productImageSrc,
} from "@/shared/presentation/product-image";
import {
  UiAlert,
  UiButton,
  UiEmpty,
  UiField,
  UiFilterLozenge,
  UiIcon,
  UiInput,
  UiPrice,
  UiSkeleton,
} from "@/shared/ui";

function onProductImageError(event: Event, imageUrl: string) {
  const img = event.target;
  if (!(img instanceof HTMLImageElement)) {
    return;
  }
  const fallback = productImageFallback(imageUrl);
  if (img.getAttribute("src") === fallback) {
    return;
  }
  img.src = fallback;
}
const SORT_PRESETS: ReadonlyArray<{
  id: string;
  sort: ProductSort;
  order: ProductOrder;
  label: string;
  icon: Component;
}> = [
  {
    id: "name-asc",
    sort: "name",
    order: "asc",
    label: "Name, A to Z",
    icon: ArrowDownAZ,
  },
  {
    id: "name-desc",
    sort: "name",
    order: "desc",
    label: "Name, Z to A",
    icon: ArrowDownZA,
  },
  {
    id: "price-asc",
    sort: "price",
    order: "asc",
    label: "Price, low to high",
    icon: ArrowDown01,
  },
  {
    id: "price-desc",
    sort: "price",
    order: "desc",
    label: "Price, high to low",
    icon: ArrowDown10,
  },
];

const DEFAULT_PRESET = SORT_PRESETS[0];

const {
  query,
  cursorMode,
  setSearch,
  setListing,
  clearFilters,
  goToPage,
  goAfter,
  goBefore,
} = useProductListQuery();
const { items, total, nextCursor, prevCursor, loading, errorMessage } =
  useProductList(query);

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
  () => appliedSearch.value.length > 0 || sortIsActive.value,
);
const resultLabel = computed(() =>
  total.value === 1 ? "1 product" : `${total.value} products`,
);
const currentPage = computed(() => query.value.page ?? 1);
const pageCount = computed(() => {
  if (total.value === 0) {
    return 0;
  }
  return Math.min(
    Math.ceil(total.value / query.value.pageSize),
    PRODUCT_LIST_OFFSET_PAGE_MAX,
  );
});
const showPagination = computed(
  () =>
    !loading.value &&
    (pageCount.value > 1 ||
      Boolean(nextCursor.value) ||
      Boolean(prevCursor.value) ||
      cursorMode.value),
);
const canGoPrev = computed(
  () => Boolean(prevCursor.value) || (!cursorMode.value && currentPage.value > 1),
);
const canGoNext = computed(
  () =>
    Boolean(nextCursor.value) ||
    (!cursorMode.value &&
      pageCount.value > 0 &&
      currentPage.value < pageCount.value),
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

watch([currentPage, pageCount, cursorMode], () => {
  if (
    !cursorMode.value &&
    pageCount.value > 0 &&
    currentPage.value > pageCount.value
  ) {
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
  if (prevCursor.value) {
    goBefore(prevCursor.value);
    return;
  }
  if (!cursorMode.value && currentPage.value > 1) {
    goToPage(currentPage.value - 1);
  }
}

function goNext() {
  if (nextCursor.value) {
    goAfter(nextCursor.value);
    return;
  }
  if (!cursorMode.value && currentPage.value < pageCount.value) {
    goToPage(currentPage.value + 1);
  }
}
</script>

<template>
  <main>
    <h1 class="text-2xl font-semibold tracking-tight">Products</h1>
    <p class="mt-1 max-w-[65ch] text-sm text-muted">
      Desk gear, priced in COP.
    </p>

    <form class="mt-5 grid gap-3" @submit.prevent="onSearchSubmit">
      <UiField v-slot="{ id }" label="Name">
        <UiInput
          :id="id"
          v-model="searchInput"
          type="search"
          maxlength="100"
          placeholder="Search by name"
          autocomplete="off"
        />
      </UiField>
      <UiField v-slot="{ id }" label="Sort">
        <div
          :id="id"
          role="radiogroup"
          aria-label="Sort"
          class="grid grid-cols-4 gap-2"
        >
          <button
            v-for="preset in SORT_PRESETS"
            :key="preset.id"
            type="button"
            role="radio"
            :aria-checked="preset.id === presetId"
            :aria-label="preset.label"
            class="inline-flex min-h-11 items-center justify-center rounded-control border transition-colors duration-200 ease-out-quart"
            :class="
              preset.id === presetId
                ? 'border-ink bg-sunken text-ink'
                : 'border-line bg-surface text-muted'
            "
            @click="presetModel = preset.id"
          >
            <UiIcon :icon="preset.icon" />
          </button>
        </div>
        <p class="text-sm text-muted">{{ appliedPreset.label }}</p>
      </UiField>
    </form>

    <div v-if="hasFilters" class="mt-3 flex flex-wrap items-center gap-2">
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

    <p
      v-if="!loading && !errorMessage"
      class="mt-4 text-sm text-muted"
      aria-live="polite"
    >
      {{ resultLabel }}
    </p>

    <div class="mt-3">
      <div v-if="loading" class="grid gap-4" aria-busy="true" aria-live="polite">
        <span class="sr-only">Loading products</span>
        <div v-for="row in 4" :key="row" class="flex gap-3">
          <UiSkeleton class="size-16" />
          <div class="grid flex-1 content-center gap-2">
            <UiSkeleton class="h-4 w-2/3" />
            <UiSkeleton class="h-4 w-1/3" />
          </div>
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

      <ul v-else class="divide-y divide-line border-y border-line">
        <li v-for="product in items" :key="product.id">
          <RouterLink
            :to="{ name: routeNames.product, params: { id: product.id } }"
            class="flex min-h-20 items-center gap-3 py-3"
          >
            <img
              :src="productImageSrc(product.imageUrl)"
              :alt="product.name"
              width="64"
              height="64"
              class="size-16 rounded-control bg-sunken object-cover"
              @error="onProductImageError($event, product.imageUrl)"
            />
            <div class="min-w-0">
              <p class="truncate font-medium">{{ product.name }}</p>
              <UiPrice :amount="product.price" size="md" class="mt-0.5" />
              <p class="text-sm text-muted">
                {{ product.availableStock }} in stock
              </p>
            </div>
          </RouterLink>
        </li>
      </ul>
    </div>

    <nav
      v-if="showPagination"
      class="mt-6 flex justify-center"
      aria-label="Pagination"
    >
      <form
        class="inline-flex items-center rounded-control border border-line bg-surface"
        @submit.prevent="jumpToDraft"
      >
        <button
          type="button"
          class="inline-flex size-11 items-center justify-center disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="!canGoPrev"
          aria-label="Previous page"
          @click="goPrev"
        >
          <UiIcon :icon="ChevronLeft" :size="18" />
        </button>
        <span class="w-px self-stretch bg-line" aria-hidden="true" />
        <label
          v-if="!cursorMode"
          class="flex items-center gap-2 px-3 text-sm"
        >
          <span class="text-muted">Page</span>
          <input
            v-model="pageDraft"
            type="number"
            inputmode="numeric"
            :min="1"
            :max="pageCount"
            aria-label="Page number"
            class="w-12 bg-transparent text-center tabular-nums text-ink outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            @change="jumpToDraft"
          />
          <span class="text-muted">of {{ pageCount }}</span>
        </label>
        <span
          v-else
          class="px-3 text-sm text-muted"
        >
          Browsing results
        </span>
        <span class="w-px self-stretch bg-line" aria-hidden="true" />
        <button
          type="button"
          class="inline-flex size-11 items-center justify-center disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="!canGoNext"
          aria-label="Next page"
          @click="goNext"
        >
          <UiIcon :icon="ChevronRight" :size="18" />
        </button>
      </form>
    </nav>
  </main>
</template>
