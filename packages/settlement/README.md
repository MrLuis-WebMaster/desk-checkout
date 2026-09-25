# `@checkout/settlement`

Shared application and domain for the **single settlement writer**.

Pay, sync, webhook, and stuck-job recovery all call `SettleProviderPaymentService` → `TransactionWriter.updateAfterPayment`, so stock never decrements on a second path. When Wompi reports approved but stock cannot be decremented, settlement persists `ERROR`, attempts a void, and completes the idempotency key with `OUT_OF_STOCK`.

This package stays free of Nest, TypeORM, and `pg` so `apps/api` and `apps/worker` can both compose it behind ports. Persistence and Wompi HTTP live in `@checkout/settlement-typeorm` and app adapters.

Guards: `no-nest-orm-imports.spec.ts`, `single-writer-surface.spec.ts`.
