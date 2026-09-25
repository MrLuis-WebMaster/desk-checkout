# ADR 0003: Guest UUID access

## Status

Accepted

## Context

Checkout is guest-only for this product: no shopper accounts. The SPA still needs to poll or show payment status after redirect/widget completion.

## Decision

Expose unauthenticated `GET /transactions/:id` keyed by transaction UUID (no session, no auth header). Treat UUIDs as capability secrets.

## Consequences

- Simple frontend flow without login.
- Residual risk: anyone who obtains a UUID can read that transaction’s status payload — do not leak IDs in public logs, referrers, or shared links beyond checkout.
- Tightening later (short-lived tokens, signed cookies) would be a breaking API change for the web app.
