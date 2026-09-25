process.env.NODE_ENV = "test";
process.env.DB_USER = process.env.DB_USER || "checkout";
process.env.DB_PASSWORD = process.env.DB_PASSWORD || "checkout";
process.env.DB_NAME = process.env.DB_NAME || "checkout";
process.env.WOMPI_PUBLIC_KEY = process.env.WOMPI_PUBLIC_KEY || "pub_test";
process.env.WOMPI_PRIVATE_KEY = process.env.WOMPI_PRIVATE_KEY || "prv_test";
process.env.WOMPI_INTEGRITY_SECRET =
  process.env.WOMPI_INTEGRITY_SECRET || "integrity_test";
process.env.WOMPI_EVENTS_SECRET =
  process.env.WOMPI_EVENTS_SECRET || "events_test_secret";
