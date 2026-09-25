# ADR 0006: Integer COP money

## Status

Accepted

## Context

Floating-point money causes rounding bugs across create, pay, Wompi amounts, and settlement. The catalog is priced in Colombian pesos (COP).

## Decision

Represent all money as **integer COP** (smallest currency unit already whole pesos for this product). Snapshot prices and fees onto the transaction at create time. Do not use floats in contracts, persistence, or payment payloads.

## Consequences

- Deterministic totals and provider amounts.
- Display formatting (e.g. COP strings) stays in the presentation layer; storage and APIs stay integers.
- Changing to minor-unit currencies later would need an explicit contract/migration plan.
