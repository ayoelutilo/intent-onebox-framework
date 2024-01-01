# intent-onebox-framework

Typed intent-to-onebox framework for Node + TypeScript, focused on confidence-aware routing and deterministic resolver fallback.

Status: source-only reference implementation (`package.json` is private).

## Features

- Heuristic intent detector with confidence and per-signal evidence.
- Resolver registry with explicit priority ordering per intent.
- Intent chain execution with fallback across both resolvers and intents.
- Typed onebox contracts for:
  - `weather`
  - `stock`
  - `calculator`
  - `dictionary`

## Quick Start

```bash
cd intent-onebox-framework
npm install
npm test
```

## Example

```ts
import { createDefaultFramework } from "./src";

const framework = createDefaultFramework();
const outcome = await framework.resolve("SYMA stock quote");

if (outcome.result?.intent === "stock") {
  console.log(outcome.result.data.symbol, outcome.result.data.price);
}
```

## Core API

- `detectIntent(query, options?)`
- `createDefaultFramework(options?)`
- `ResolverRegistry` for custom resolver composition
- `IntentOneboxFramework.resolve(query, context?)`

## Notes

- The built-in resolvers are deterministic fixture-backed implementations for framework testing and extension.
- Confidence merges detector confidence with resolver confidence so chains can be audited consistently.
