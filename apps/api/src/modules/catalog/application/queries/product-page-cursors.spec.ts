import {
  decodeProductCursor,
  encodeProductCursor,
} from "./product-cursor";
import { buildProductPageCursors } from "./product-page-cursors";

const item = (id: string, name: string, price = 1000) => ({
  id,
  name,
  price,
  imageUrl: `/products/${name}.svg`,
  availableStock: 1,
});

describe("buildProductPageCursors", () => {
  const sort = "name" as const;
  const order = "asc" as const;

  it("returns null links on an empty page", () => {
    expect(
      buildProductPageCursors({
        items: [],
        sort,
        order,
        goingBackward: false,
        hasExtra: false,
        usedAfter: false,
        offsetPageNumber: 1,
      }),
    ).toEqual({ nextCursor: null, prevCursor: null });
  });

  it("uses the last returned row as nextCursor when a forward peek exists", () => {
    const first = item("1", "A");
    const last = item("2", "B");
    const links = buildProductPageCursors({
      items: [first, last],
      sort,
      order,
      goingBackward: false,
      hasExtra: true,
      usedAfter: false,
      offsetPageNumber: 1,
    });

    expect(links.prevCursor).toBeNull();
    expect(links.nextCursor).not.toBeNull();
    expect(decodeProductCursor(links.nextCursor!)).toMatchObject({
      id: "2",
      name: "B",
      sort,
      order,
    });
  });

  it("sets prevCursor from the first row after an after-cursor page", () => {
    const first = item("2", "B");
    const last = item("3", "C");
    const links = buildProductPageCursors({
      items: [first, last],
      sort,
      order,
      goingBackward: false,
      hasExtra: false,
      usedAfter: true,
      offsetPageNumber: 1,
    });

    expect(links.nextCursor).toBeNull();
    expect(decodeProductCursor(links.prevCursor!)).toMatchObject({
      id: "2",
      name: "B",
    });
  });

  it("sets both links when walking backward with a peek behind", () => {
    const first = item("1", "A");
    const last = item("2", "B");
    const links = buildProductPageCursors({
      items: [first, last],
      sort,
      order,
      goingBackward: true,
      hasExtra: true,
      usedAfter: false,
      offsetPageNumber: 1,
    });

    expect(decodeProductCursor(links.prevCursor!)).toMatchObject({ id: "1" });
    expect(decodeProductCursor(links.nextCursor!)).toMatchObject({ id: "2" });
  });

  it("sets prevCursor for offset pages beyond the first", () => {
    const first = item("11", "K");
    const links = buildProductPageCursors({
      items: [first, item("12", "L")],
      sort,
      order,
      goingBackward: false,
      hasExtra: true,
      usedAfter: false,
      offsetPageNumber: 2,
    });

    expect(decodeProductCursor(links.prevCursor!)).toMatchObject({ id: "11" });
    expect(links.nextCursor).toBe(
      encodeProductCursor({
        sort,
        order,
        name: "L",
        price: 1000,
        id: "12",
      }),
    );
  });
});
