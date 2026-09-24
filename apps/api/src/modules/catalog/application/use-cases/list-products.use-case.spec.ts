import { encodeProductCursor } from "../queries/product-cursor";
import {
  InvalidProductCursorError,
  ListProductsUseCase,
} from "./list-products.use-case";

const PRODUCT_ID = "11111111-1111-4111-8111-111111111111";

describe("ListProductsUseCase", () => {
  const productReader = {
    list: jest.fn(),
    findById: jest.fn(),
  };

  beforeEach(() => {
    productReader.list.mockReset();
    productReader.list.mockResolvedValue({
      items: [],
      pageSize: 10,
      total: 0,
      nextCursor: null,
      prevCursor: null,
    });
  });

  it("rejects after and before together", async () => {
    const useCase = new ListProductsUseCase(productReader);
    const cursor = encodeProductCursor({
      sort: "name",
      order: "asc",
      q: "",
      name: "A",
      price: 1,
      id: PRODUCT_ID,
    });

    const result = await useCase.execute({
      pageSize: 10,
      sort: "name",
      order: "asc",
      after: cursor,
      before: cursor,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(InvalidProductCursorError);
    }
    expect(productReader.list).not.toHaveBeenCalled();
  });

  it("rejects mixing page with after", async () => {
    const useCase = new ListProductsUseCase(productReader);
    const cursor = encodeProductCursor({
      sort: "name",
      order: "asc",
      q: "",
      name: "A",
      price: 1,
      id: PRODUCT_ID,
    });

    const result = await useCase.execute({
      pageSize: 10,
      sort: "name",
      order: "asc",
      page: 2,
      after: cursor,
    });

    expect(result.ok).toBe(false);
    expect(productReader.list).not.toHaveBeenCalled();
  });

  it("rejects a cursor whose q does not match the query", async () => {
    const useCase = new ListProductsUseCase(productReader);
    const cursor = encodeProductCursor({
      sort: "name",
      order: "asc",
      q: "",
      name: "A",
      price: 1,
      id: PRODUCT_ID,
    });

    const result = await useCase.execute({
      pageSize: 10,
      sort: "name",
      order: "asc",
      q: "USB",
      after: cursor,
    });

    expect(result.ok).toBe(false);
    expect(productReader.list).not.toHaveBeenCalled();
  });

  it("allows cursor-only queries when q matches", async () => {
    const useCase = new ListProductsUseCase(productReader);
    const cursor = encodeProductCursor({
      sort: "name",
      order: "asc",
      q: "usb",
      name: "A",
      price: 1,
      id: PRODUCT_ID,
    });

    const result = await useCase.execute({
      pageSize: 10,
      sort: "name",
      order: "asc",
      q: "usb",
      after: cursor,
    });

    expect(result.ok).toBe(true);
    expect(productReader.list).toHaveBeenCalledWith({
      pageSize: 10,
      sort: "name",
      order: "asc",
      q: "usb",
      after: cursor,
    });
  });

  it("allows offset page without cursors", async () => {
    const useCase = new ListProductsUseCase(productReader);

    const result = await useCase.execute({
      pageSize: 10,
      sort: "name",
      order: "asc",
      page: 3,
    });

    expect(result.ok).toBe(true);
    expect(productReader.list).toHaveBeenCalledWith({
      pageSize: 10,
      sort: "name",
      order: "asc",
      page: 3,
    });
  });
});
