import {
  decodeProductCursor,
  encodeProductCursor,
} from "./product-cursor";
import { buildProductPageCursors } from "./product-page-cursors";

const ID_A = "11111111-1111-4111-8111-111111111111";
const ID_B = "22222222-2222-4222-8222-222222222222";
const ID_C = "33333333-3333-4333-8333-333333333333";
const ID_K = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ID_L = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

const item = (id: string, name: string, price = 1000) => ({
  id,
  name,
  price,
  imageUrl: `/products/${name}.svg`,
  availableStock: 1,
});

describe("decodeProductCursor", () => {
  it("rejects a non-uuid id", () => {
    const forged = Buffer.from(
      JSON.stringify({
        sort: "name",
        order: "asc",
        q: "",
        name: "A",
        price: 1000,
        id: "not-a-uuid",
      }),
      "utf8",
    ).toString("base64url");
    expect(decodeProductCursor(forged)).toBeNull();
  });

  it("rejects a fractional price", () => {
    const forged = Buffer.from(
      JSON.stringify({
        sort: "name",
        order: "asc",
        q: "",
        name: "A",
        price: 10.5,
        id: ID_A,
      }),
      "utf8",
    ).toString("base64url");
    expect(decodeProductCursor(forged)).toBeNull();
  });

  it("accepts a valid cursor and normalizes q", () => {
    const raw = encodeProductCursor({
      sort: "name",
      order: "asc",
      q: "  usb  ",
      name: "A",
      price: 1000,
      id: ID_A,
    });
    expect(decodeProductCursor(raw)).toMatchObject({
      id: ID_A,
      q: "usb",
      price: 1000,
    });
  });
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
        q: undefined,
        goingBackward: false,
        hasExtra: false,
        usedAfter: false,
        offsetPageNumber: 1,
      }),
    ).toEqual({ nextCursor: null, prevCursor: null });
  });

  it("uses the last returned row as nextCursor when a forward peek exists", () => {
    const first = item(ID_A, "A");
    const last = item(ID_B, "B");
    const links = buildProductPageCursors({
      items: [first, last],
      sort,
      order,
      q: "usb",
      goingBackward: false,
      hasExtra: true,
      usedAfter: false,
      offsetPageNumber: 1,
    });

    expect(links.prevCursor).toBeNull();
    expect(links.nextCursor).not.toBeNull();
    expect(decodeProductCursor(links.nextCursor!)).toMatchObject({
      id: ID_B,
      name: "B",
      q: "usb",
      sort,
      order,
    });
  });

  it("sets prevCursor from the first row after an after-cursor page", () => {
    const first = item(ID_B, "B");
    const last = item(ID_C, "C");
    const links = buildProductPageCursors({
      items: [first, last],
      sort,
      order,
      q: undefined,
      goingBackward: false,
      hasExtra: false,
      usedAfter: true,
      offsetPageNumber: 1,
    });

    expect(links.nextCursor).toBeNull();
    expect(decodeProductCursor(links.prevCursor!)).toMatchObject({
      id: ID_B,
      name: "B",
      q: "",
    });
  });

  it("sets both links when walking backward with a peek behind", () => {
    const first = item(ID_A, "A");
    const last = item(ID_B, "B");
    const links = buildProductPageCursors({
      items: [first, last],
      sort,
      order,
      q: undefined,
      goingBackward: true,
      hasExtra: true,
      usedAfter: false,
      offsetPageNumber: 1,
    });

    expect(decodeProductCursor(links.prevCursor!)).toMatchObject({ id: ID_A });
    expect(decodeProductCursor(links.nextCursor!)).toMatchObject({ id: ID_B });
  });

  it("sets prevCursor for offset pages beyond the first", () => {
    const first = item(ID_K, "K");
    const links = buildProductPageCursors({
      items: [first, item(ID_L, "L")],
      sort,
      order,
      q: undefined,
      goingBackward: false,
      hasExtra: true,
      usedAfter: false,
      offsetPageNumber: 2,
    });

    expect(decodeProductCursor(links.prevCursor!)).toMatchObject({ id: ID_K });
    expect(links.nextCursor).toBe(
      encodeProductCursor({
        sort,
        order,
        q: "",
        name: "L",
        price: 1000,
        id: ID_L,
      }),
    );
  });
});
