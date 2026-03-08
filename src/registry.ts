import { IntentResolver, ResolverIntent } from "./types";

export class ResolverRegistry {
  private readonly resolverMap: Map<ResolverIntent, IntentResolver[]> = new Map([
    ["weather", []],
    ["stock", []],
    ["calculator", []],
    ["dictionary", []]
  ]);

  register(resolver: IntentResolver): void {
    const list = this.resolverMap.get(resolver.intent);
    if (!list) {
      throw new Error(`Unsupported resolver intent: ${resolver.intent}`);
    }

    const existingIndex = list.findIndex((item) => item.id === resolver.id);
    if (existingIndex >= 0) {
      list.splice(existingIndex, 1);
    }

    list.push(resolver);
    list.sort((left, right) => right.priority - left.priority);
  }

  registerMany(resolvers: IntentResolver[]): void {
    for (const resolver of resolvers) {
      this.register(resolver);
    }
  }

  get(intent: ResolverIntent): IntentResolver[] {
    const list = this.resolverMap.get(intent);
    return list ? [...list] : [];
  }

  clear(): void {
    for (const key of this.resolverMap.keys()) {
      this.resolverMap.set(key, []);
    }
  }
}

// Refinement.

// Refinement.
