import { parseApiEnv } from "./env";

describe("parseApiEnv", () => {
  const db = {
    DB_USER: "checkout",
    DB_PASSWORD: "checkout",
    DB_NAME: "checkout",
  };
  const wompi = {
    WOMPI_PUBLIC_KEY: "pub_test",
    WOMPI_PRIVATE_KEY: "prv_test",
    WOMPI_INTEGRITY_SECRET: "integrity",
  };

  it("applies host/port defaults when variables are missing", () => {
    expect(
      parseApiEnv({
        CORS_ORIGIN: "http://localhost:5173",
        ...db,
        ...wompi,
      }),
    ).toEqual({
      PORT: 3000,
      CORS_ORIGIN: ["http://localhost:5173"],
      DB_HOST: "localhost",
      DB_PORT: 5433,
      DB_USER: "checkout",
      DB_PASSWORD: "checkout",
      DB_NAME: "checkout",
      NODE_ENV: "development",
      WOMPI_BASE_URL: "https://sandbox.wompi.co/v1",
      ...wompi,
    });
  });

  it("requires CORS_ORIGIN from the environment", () => {
    expect(() => parseApiEnv({ ...db })).toThrow(/CORS_ORIGIN/);
  });

  it("requires DB credentials from the environment", () => {
    expect(() =>
      parseApiEnv({ CORS_ORIGIN: "http://localhost:5173" }),
    ).toThrow(/DB_/);
  });

  it("parses configured values", () => {
    expect(
      parseApiEnv({
        PORT: "4000",
        CORS_ORIGIN: "http://localhost:5173, https://shop.example",
        DB_HOST: "db",
        DB_PORT: "5432",
        DB_USER: "user",
        DB_PASSWORD: "secret",
        DB_NAME: "shop",
        NODE_ENV: "production",
        WOMPI_BASE_URL: "https://production.wompi.co/v1",
        ...wompi,
      }),
    ).toEqual({
      PORT: 4000,
      CORS_ORIGIN: ["http://localhost:5173", "https://shop.example"],
      DB_HOST: "db",
      DB_PORT: 5432,
      DB_USER: "user",
      DB_PASSWORD: "secret",
      DB_NAME: "shop",
      NODE_ENV: "production",
      WOMPI_BASE_URL: "https://production.wompi.co/v1",
      ...wompi,
    });
  });

  it("requires the Wompi base URL in production", () => {
    expect(() =>
      parseApiEnv({
        CORS_ORIGIN: "http://localhost:5173",
        NODE_ENV: "production",
        ...db,
        ...wompi,
      }),
    ).toThrow(/WOMPI_BASE_URL/);
  });

  it("requires Wompi keys outside test", () => {
    expect(() =>
      parseApiEnv({ CORS_ORIGIN: "http://localhost:5173", ...db }),
    ).toThrow(/WOMPI_/);
  });

  it("allows empty Wompi keys when NODE_ENV is test", () => {
    expect(
      parseApiEnv({
        CORS_ORIGIN: "http://localhost:5173",
        NODE_ENV: "test",
        ...db,
      }).WOMPI_PUBLIC_KEY,
    ).toBe("");
  });

  it("rejects an invalid port", () => {
    expect(() =>
      parseApiEnv({ PORT: "0", CORS_ORIGIN: "http://localhost:5173", ...db }),
    ).toThrow(/PORT/);
  });

  it("rejects a CORS origin that is not an http URL", () => {
    expect(() =>
      parseApiEnv({ CORS_ORIGIN: "ftp://files.example", ...db }),
    ).toThrow(/CORS_ORIGIN/);
  });
});
