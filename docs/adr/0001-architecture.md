# ADR 0001: Intent Routing and Onebox Resolution Architecture

## Status

Accepted

## Context

The system must route user queries into typed onebox responses with clear confidence semantics and robust fallback behavior when intent classification is ambiguous or resolver data is missing.

## Decision

The architecture has three layers:

1. Detection layer
   - `HeuristicIntentDetector` scores weather, stock, calculator, and dictionary intents independently.
   - Confidence includes ambiguity penalties when top intents are too close.

2. Resolver layer
   - `ResolverRegistry` stores resolvers by intent and sorts by descending priority.
   - Each resolver returns a typed contract or `null`.

3. Execution layer
   - `IntentOneboxFramework` builds an intent chain from detector output plus configured fallback order.
   - It executes resolvers in order, records every attempt, and returns the first successful typed result.

## Consequences

- Fully typed onebox outputs prevent schema drift by intent.
- Execution attempts provide auditable behavior for confusion and fallback cases.
- Deterministic fixture-backed resolvers keep regression tests stable.
- Heuristic detector is transparent but may require tuning for domain-specific language.

- Changelog: minor updates.
