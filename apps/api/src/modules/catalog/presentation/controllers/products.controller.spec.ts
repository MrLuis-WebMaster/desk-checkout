import { Test } from "@nestjs/testing";
import { ValidationPipe } from "@nestjs/common";
import { ApiErrorCode } from "@checkout/contracts";
import { err, ok } from "#shared/result/result.js";
import { ProductNotFoundError } from "../../domain/product/errors";
import { GetProductUseCase } from "../../application/use-cases/get-product.use-case";
import { ListProductsUseCase } from "../../application/use-cases/list-products.use-case";
import { ProductsController } from "./products.controller";
import { ListProductsQueryDto } from "../dto/list-products.query.dto";
import { ProductParamsDto } from "../dto/product-params.dto";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";

describe("ProductsController", () => {
  const listProducts = { execute: jest.fn() };
  const getProduct = { execute: jest.fn() };
  let controller: ProductsController;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        { provide: ListProductsUseCase, useValue: listProducts },
        { provide: GetProductUseCase, useValue: getProduct },
      ],
    }).compile();

    controller = moduleRef.get(ProductsController);
    listProducts.execute.mockReset();
    getProduct.execute.mockReset();
  });

  it("returns the product page from the use case", async () => {
    const page = {
      items: [],
      page: 1,
      pageSize: 10,
      total: 0,
    };
    listProducts.execute.mockResolvedValue(ok(page));

    await expect(
      controller.list({
        pageSize: 10,
        sort: "name",
        order: "asc",
      }),
    ).resolves.toEqual(page);
  });

  it("throws ProductNotFound when the product is missing", async () => {
    getProduct.execute.mockResolvedValue(
      err(new ProductNotFoundError("11111111-1111-4111-8111-111111111111")),
    );

    await expect(
      controller.show({ id: "11111111-1111-4111-8111-111111111111" }),
    ).rejects.toMatchObject({
      response: {
        code: ApiErrorCode.ProductNotFound,
        message: "Product not found",
      },
      status: 404,
    });
  });
});

describe("ListProductsQueryDto", () => {
  it("rejects out of range pageSize", async () => {
    const dto = plainToInstance(ListProductsQueryDto, { pageSize: 51 });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("rejects invalid sort", async () => {
    const dto = plainToInstance(ListProductsQueryDto, { sort: "createdAt" });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("accepts defaults for an empty query", async () => {
    const dto = plainToInstance(ListProductsQueryDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.pageSize).toBe(12);
    expect(dto.sort).toBe("name");
    expect(dto.order).toBe("asc");
  });
});

describe("ProductParamsDto", () => {
  it("rejects a non-uuid id", async () => {
    const dto = plainToInstance(ProductParamsDto, { id: "headphones" });
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("accepts a uuid v4 id", async () => {
    const dto = plainToInstance(ProductParamsDto, {
      id: "11111111-1111-4111-8111-111111111111",
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});

describe("GetProductUseCase available stock", () => {
  it("keeps availableStock 0 when the reader returns zero", async () => {
    const productReader = {
      list: jest.fn(),
      findById: jest.fn().mockResolvedValue({
        id: "11111111-1111-4111-8111-111111111111",
        name: "Ghost",
        description: "No inventory row",
        price: 1000,
        imageUrl: "/products/ghost.svg",
        availableStock: 0,
      }),
    };
    const useCase = new GetProductUseCase(productReader);
    const result = await useCase.execute(
      "11111111-1111-4111-8111-111111111111",
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.availableStock).toBe(0);
    }
  });
});

describe("ValidationPipe uuid path", () => {
  it("transforms and validates ProductParamsDto", async () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });

    await expect(
      pipe.transform(
        { id: "not-a-uuid" },
        { type: "param", metatype: ProductParamsDto, data: "" },
      ),
    ).rejects.toBeInstanceOf(Error);
  });
});
