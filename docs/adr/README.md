# Architecture Decision Records

Short ADRs for checkout settlement and deploy constraints. Status is **Accepted** unless noted.

| ADR | Title |
| --- | --- |
| [0001](0001-separate-worker.md) | Separate worker for webhooks and reconciliation |
| [0002](0002-single-settlement-writer.md) | Single settlement writer |
| [0003](0003-guest-uuid-access.md) | Guest UUID access to transactions |
| [0004](0004-trust-proxy-and-single-replica.md) | Trust proxy off by default; one API replica |
| [0005](0005-dist-only-migrate-on-start.md) | Dist-only migrate-on-start |
| [0006](0006-integer-cop-money.md) | Integer COP money |
| [0007](0007-stock-decrement-on-approved-only.md) | Stock decrement only on APPROVED |
| [0008](0008-rabbitmq-asynchronous-messaging.md) | RabbitMQ for async payment events |
| [0009](0009-transactional-outbox.md) | Transactional outbox for order.confirmed |
