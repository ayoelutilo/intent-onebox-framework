import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { readFileSync } from "node:fs";

import { HeuristicIntentDetector } from "../src/detector";
import { IntentOneboxFramework } from "../src/framework";
import { ResolverRegistry } from "../src/registry";
import { InMemoryStockResolver } from "../src/resolvers/stockResolver";
import { InMemoryWeatherResolver } from "../src/resolvers/weatherResolver";
import { createDefaultFramework } from "../src";
import { IntentResolver } from "../src/types";

interface ConfusionCase {
  query: string;
  expectedTopIntent: "weather" | "stock" | "calculator" | "dictionary";
  expectedResolvedIntent: "weather" | "stock" | "calculator" | "dictionary";
}

function loadConfusionCases(): ConfusionCase[] {
  const fixturePath = path.resolve(process.cwd(), "tests/fixtures/intent-confusion-cases.json");
  return JSON.parse(readFileSync(fixturePath, "utf8")) as ConfusionCase[];
}

test("intent confusion fixture stays stable", async () => {
  const framework = createDefaultFramework();
  const cases = loadConfusionCases();

  for (const testCase of cases) {
    const outcome = await framework.resolve(testCase.query);
    assert.equal(outcome.detection.topIntent, testCase.expectedTopIntent);
    assert.ok(outcome.result, `Expected onebox result for query: ${testCase.query}`);
    assert.equal(outcome.result?.intent, testCase.expectedResolvedIntent);
    assert.ok(outcome.result?.confidence !== undefined);
  }
});

test("framework falls through to next intent candidate when top resolver misses", async () => {
  const detector = {
    detect(query: string) {
      return {
        query,
        normalizedQuery: query.toLowerCase(),
        topIntent: "weather" as const,
        topConfidence: 0.92,
        candidates: [
          { intent: "weather" as const, confidence: 0.92, signals: ["forced_order"] },
          { intent: "stock" as const, confidence: 0.81, signals: ["forced_order"] },
          { intent: "unknown" as const, confidence: 0.19, signals: ["fallback_guard"] }
        ]
      };
    }
  };
  const registry = new ResolverRegistry();

  const alwaysNullWeatherResolver: IntentResolver<"weather"> = {
    id: "weather:null",
    intent: "weather",
    priority: 999,
    async resolve() {
      return null;
    }
  };

  registry.register(alwaysNullWeatherResolver);
  registry.register(new InMemoryWeatherResolver(90));
  registry.register(new InMemoryStockResolver(85));

  const framework = new IntentOneboxFramework(detector, registry, {
    minDetectConfidence: 0.25,
    minResolverConfidence: 0.18,
    fallbackOrder: ["stock", "weather", "calculator", "dictionary"]
  });

  const outcome = await framework.resolve("weather in seattle and betaworks stock price");

  assert.ok(outcome.result);
  assert.equal(outcome.result?.intent, "stock");
  const weatherNullAttempt = outcome.attempts.find((attempt) => attempt.resolverId === "weather:null");
  assert.ok(weatherNullAttempt);
  assert.equal(weatherNullAttempt?.status, "miss");
  assert.ok(outcome.attempts.some((attempt) => attempt.intent === "stock" && attempt.status === "resolved"));
});

test("low-confidence gibberish query returns no onebox", async () => {
  const framework = createDefaultFramework({
    minDetectConfidence: 0.5,
    minResolverConfidence: 0.45
  });

  const outcome = await framework.resolve("qzxv lmnrt pqlf");

  assert.equal(outcome.detection.topIntent, "unknown");
  assert.equal(outcome.result, null);
  assert.ok(outcome.failureReason);
});

test("dictionary-like queries do not fall through to stock alias substrings", async () => {
  const framework = createDefaultFramework();

  const outcome = await framework.resolve("what does alphacorpus mean");

  assert.notEqual(outcome.result?.intent, "stock");
});

test("stock resolver still resolves company aliases when stock context is explicit", async () => {
  const framework = createDefaultFramework();

  const outcome = await framework.resolve("alphacorp stock price");

  assert.ok(outcome.result);
  assert.equal(outcome.result?.intent, "stock");
  if (outcome.result?.intent !== "stock") {
    throw new Error("expected stock intent result");
  }
  assert.equal(outcome.result.data.symbol, "SYMA");
});

test("unknown top intent does not execute fallback resolver chain", async () => {
  const framework = createDefaultFramework({
    minDetectConfidence: 0.95,
    minResolverConfidence: 0.1,
  });

  const outcome = await framework.resolve("alphacorp stock price");

  assert.equal(outcome.detection.topIntent, "unknown");
  assert.equal(outcome.result, null);
  assert.equal(outcome.attempts.length, 0);
});

test("keyword detector avoids substring false positives", () => {
  const detector = new HeuristicIntentDetector();
  const detection = detector.detect("weather in stockholm this week");

  assert.equal(detection.topIntent, "weather");
});
