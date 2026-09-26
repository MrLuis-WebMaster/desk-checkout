import { parseWorkerEnv } from "./env";

describe("parseWorkerEnv", () => {
  const base = {
    DB_USER: "checkout",
    DB_PASSWORD: "checkout",
    DB_NAME: "checkout",
    WOMPI_PUBLIC_KEY: "pub_test",
    WOMPI_PRIVATE_KEY: "prv_test",
    WOMPI_INTEGRITY_SECRET: "integrity",
    RABBITMQ_URL: "amqp://guest:guest@localhost:5672",
  };

  it("applies defaults and sandbox base url outside production", () => {
    expect(parseWorkerEnv({ ...base, NODE_ENV: "test" })).toMatchObject({
      PORT: 3001,
      DB_HOST: "localhost",
      DB_PORT: 5433,
      NODE_ENV: "test",
      WOMPI_BASE_URL: "https://sandbox.wompi.co/v1",
      RABBITMQ_URL: "amqp://guest:guest@localhost:5672",
      STUCK_PENDING_AFTER_MS: 120_000,
      ORPHAN_PENDING_TTL_MS: 1_800_000,
      JOB_INTERVAL_MS: 60_000,
      OUTBOX_POLL_MS: 5_000,
    });
  });

  it("prefers WORKER_PORT over PORT", () => {
    expect(
      parseWorkerEnv({
        ...base,
        NODE_ENV: "test",
        PORT: "3000",
        WORKER_PORT: "3001",
      }).PORT,
    ).toBe(3001);
  });

  it("requires Wompi secrets outside test when empty", () => {
    expect(() =>
      parseWorkerEnv({
        NODE_ENV: "development",
        DB_USER: "checkout",
        DB_PASSWORD: "checkout",
        DB_NAME: "checkout",
      }),
    ).toThrow(/WOMPI_PUBLIC_KEY/);
  });

  it("requires WOMPI_BASE_URL in production", () => {
    expect(() =>
      parseWorkerEnv({
        ...base,
        NODE_ENV: "production",
        WOMPI_BASE_URL: "",
      }),
    ).toThrow(/WOMPI_BASE_URL/);
  });

  it("requires RABBITMQ_URL in production", () => {
    expect(() =>
      parseWorkerEnv({
        DB_USER: "checkout",
        DB_PASSWORD: "checkout",
        DB_NAME: "checkout",
        WOMPI_PUBLIC_KEY: "pub_test",
        WOMPI_PRIVATE_KEY: "prv_test",
        WOMPI_INTEGRITY_SECRET: "integrity",
        NODE_ENV: "production",
        WOMPI_BASE_URL: "https://production.wompi.co/v1",
      }),
    ).toThrow(/RABBITMQ_URL/);
  });

  it("defaults RABBITMQ_URL outside production when unset", () => {
    expect(
      parseWorkerEnv({
        DB_USER: "checkout",
        DB_PASSWORD: "checkout",
        DB_NAME: "checkout",
        WOMPI_PUBLIC_KEY: "pub_test",
        WOMPI_PRIVATE_KEY: "prv_test",
        WOMPI_INTEGRITY_SECRET: "integrity",
        NODE_ENV: "development",
      }).RABBITMQ_URL,
    ).toBe("amqp://guest:guest@localhost:5672");
  });

  it("rejects a non-http base url", () => {
    expect(() =>
      parseWorkerEnv({
        ...base,
        NODE_ENV: "development",
        WOMPI_BASE_URL: "ftp://example.com",
      }),
    ).toThrow(/http\(s\) URL/);
  });
});
