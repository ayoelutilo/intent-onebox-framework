import { DEFAULT_FALLBACK_ORDER, HeuristicIntentDetector } from "./detector";
import { ResolverRegistry } from "./registry";
import {
  FrameworkOptions,
  IntentCandidate,
  IntentDetector,
  ResolveContext,
  ResolveOutcome,
  ResolverIntent,
  SupportedIntent
} from "./types";

interface ChainIntent {
  intent: ResolverIntent;
  confidence: number;
}

const DEFAULT_OPTIONS: Required<FrameworkOptions> = {
  minDetectConfidence: 0.34,
  minResolverConfidence: 0.2,
  fallbackOrder: DEFAULT_FALLBACK_ORDER
};

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

export class IntentOneboxFramework {
  private readonly detector: IntentDetector;

  private readonly registry: ResolverRegistry;

  private readonly options: Required<FrameworkOptions>;

  constructor(
    detector: IntentDetector,
    registry: ResolverRegistry,
    options: FrameworkOptions = {}
  ) {
    this.detector = detector;
    this.registry = registry;
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
      fallbackOrder: options.fallbackOrder ?? DEFAULT_OPTIONS.fallbackOrder
    };
  }

  async resolve(query: string, context: ResolveContext = {}): Promise<ResolveOutcome> {
    const detection = this.detector.detect(query, {
      minConfidence: this.options.minDetectConfidence
    });

    if (detection.topIntent === "unknown") {
      return {
        query,
        detection,
        result: null,
        attempts: [],
        failureReason: "Top intent below detection confidence threshold"
      };
    }

    const hydratedContext = {
      now: context.now ?? new Date(),
      locale: context.locale ?? "en-US"
    };

    const chain = this.buildIntentChain(detection.candidates);
    const attempts: ResolveOutcome["attempts"] = [];

    for (const candidate of chain) {
      const resolvers = this.registry.get(candidate.intent);
      if (resolvers.length === 0) {
        attempts.push({
          intent: candidate.intent,
          resolverId: "<none>",
          priority: 0,
          status: "miss",
          message: "No resolver registered for intent"
        });
        continue;
      }

      for (const resolver of resolvers) {
        try {
          const result = await resolver.resolve(query, detection, hydratedContext);
          if (!result) {
            attempts.push({
              intent: candidate.intent,
              resolverId: resolver.id,
              priority: resolver.priority,
              status: "miss",
              message: "Resolver returned null"
            });
            continue;
          }

          const mergedConfidence = clamp(candidate.confidence * 0.7 + result.confidence * 0.3);
          attempts.push({
            intent: candidate.intent,
            resolverId: resolver.id,
            priority: resolver.priority,
            status: "resolved"
          });

          return {
            query,
            detection,
            result: {
              ...result,
              confidence: Number(mergedConfidence.toFixed(3))
            },
            attempts
          };
        } catch (error) {
          attempts.push({
            intent: candidate.intent,
            resolverId: resolver.id,
            priority: resolver.priority,
            status: "error",
            message: error instanceof Error ? error.message : "Resolver threw an unknown error"
          });
        }
      }
    }

    return {
      query,
      detection,
      result: null,
      attempts,
      failureReason: "No resolver produced a onebox result"
    };
  }

  private buildIntentChain(candidates: IntentCandidate[]): ChainIntent[] {
    const chain: ChainIntent[] = [];
    const seen = new Set<SupportedIntent>();

    for (const candidate of candidates) {
      if (candidate.intent === "unknown") {
        continue;
      }
      if (candidate.confidence < this.options.minResolverConfidence) {
        continue;
      }
      chain.push({
        intent: candidate.intent,
        confidence: candidate.confidence
      });
      seen.add(candidate.intent);
    }

    for (const fallbackIntent of this.options.fallbackOrder) {
      if (seen.has(fallbackIntent)) {
        continue;
      }
      chain.push({
        intent: fallbackIntent,
        confidence: this.options.minResolverConfidence / 2
      });
    }

    return chain;
  }
}

export function createFramework(options: FrameworkOptions = {}): IntentOneboxFramework {
  return new IntentOneboxFramework(new HeuristicIntentDetector(), new ResolverRegistry(), options);
}

// Refinement.

// Refinement.
