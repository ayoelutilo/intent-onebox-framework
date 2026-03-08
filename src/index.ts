import { HeuristicIntentDetector } from "./detector";
import { IntentOneboxFramework } from "./framework";
import { ResolverRegistry } from "./registry";
import { SafeCalculatorResolver } from "./resolvers/calculatorResolver";
import { InMemoryDictionaryResolver } from "./resolvers/dictionaryResolver";
import { InMemoryStockResolver } from "./resolvers/stockResolver";
import { InMemoryWeatherResolver } from "./resolvers/weatherResolver";
import { FrameworkOptions } from "./types";

export * from "./types";
export * from "./detector";
export * from "./registry";
export * from "./framework";
export * from "./resolvers/calculatorResolver";
export * from "./resolvers/dictionaryResolver";
export * from "./resolvers/stockResolver";
export * from "./resolvers/weatherResolver";

export function createDefaultFramework(options: FrameworkOptions = {}): IntentOneboxFramework {
  const detector = new HeuristicIntentDetector();
  const registry = new ResolverRegistry();

  registry.registerMany([
    new SafeCalculatorResolver(100),
    new InMemoryWeatherResolver(90),
    new InMemoryStockResolver(85),
    new InMemoryDictionaryResolver(80)
  ]);

  return new IntentOneboxFramework(detector, registry, options);
}

// Refinement.

// Refinement.
