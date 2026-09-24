# ADR-003: Pinia over Vuex

## Status

Accepted

## Context

The challenge asks for Redux or Vuex. This frontend is Vue 3. Pinia is the state library maintained by the Vue core team and is the current replacement for Vuex.

## Decision

Use Pinia for UI state, checkout progress, and session state.

Domain rules stay outside the store: price calculation, stock checks, and payment decisions live in application and domain code, and on the backend.

Card number, CVV, and payment secrets are never written to Pinia or localStorage.

## Consequences

The repository documents a conscious deviation from the Vuex requirement. Vue DevTools, TypeScript inference, and the Composition API stay aligned with Vue 3.
