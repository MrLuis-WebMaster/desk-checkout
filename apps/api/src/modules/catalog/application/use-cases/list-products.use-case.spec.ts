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

  it("allows ids-only queries without cursors", async () => {
    const useCase = new ListProductsUseCase(productReader);
    const ids = [PRODUCT_ID, "22222222-2222-4222-8222-222222222222"];

    const result = await useCase.execute({
      pageSize: 10,
      sort: "name",
      order: "asc",
      ids,
    });

    expect(result.ok).toBe(true);
    expect(productReader.list).toHaveBeenCalledWith({
      pageSize: 10,
      sort: "name",
      order: "asc",
      ids,
    });
  });

  it("rejects mixing ids with page", async () => {
    const useCase = new ListProductsUseCase(productReader);

    const result = await useCase.execute({
      pageSize: 10,
      sort: "name",
      order: "asc",
      page: 1,
      ids: [PRODUCT_ID],
    });

    expect(result.ok).toBe(false);
    expect(productReader.list).not.toHaveBeenCalled();
  });

  it("rejects mixing ids with q", async () => {
    const useCase = new ListProductsUseCase(productReader);

    const result = await useCase.execute({
      pageSize: 10,
      sort: "name",
      order: "asc",
      q: "usb",
      ids: [PRODUCT_ID],
    });

    expect(result.ok).toBe(false);
    expect(productReader.list).not.toHaveBeenCalled();
  });
});
