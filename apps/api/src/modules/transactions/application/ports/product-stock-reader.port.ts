export type ProductStock = {
  id: string;
  name: string;
  price: number;
  availableStock: number;
};

export abstract class ProductStockReader {
  abstract findById(id: string): Promise<ProductStock | null>;
}
