export type ResolverIntent = "weather" | "stock" | "calculator" | "dictionary";
export type SupportedIntent = ResolverIntent | "unknown";

export interface IntentCandidate {
  intent: SupportedIntent;
  confidence: number;
  signals: string[];
}

export interface IntentDetectionResult {
  query: string;
  normalizedQuery: string;
  topIntent: SupportedIntent;
  topConfidence: number;
  candidates: IntentCandidate[];
}

export interface DetectionOptions {
  minConfidence?: number;
}

export interface ResolveContext {
  now?: Date;
  locale?: string;
}

export interface ResolveAttempt {
  intent: SupportedIntent;
  resolverId: string;
  priority: number;
  status: "resolved" | "miss" | "error";
  message?: string;
}

interface OneboxBase<TIntent extends ResolverIntent, TPayload> {
  intent: TIntent;
  confidence: number;
  source: string;
  summary: string;
  data: TPayload;
}

export interface WeatherOneboxResult
  extends OneboxBase<
    "weather",
    {
      location: string;
      condition: string;
      temperatureC: number;
      feelsLikeC: number;
      forecast: string[];
    }
  > {}

export interface StockOneboxResult
  extends OneboxBase<
    "stock",
    {
      symbol: string;
      price: number;
      currency: "USD";
      changePercent: number;
      marketState: "open" | "closed";
    }
  > {}

export interface CalculatorOneboxResult
  extends OneboxBase<
    "calculator",
    {
      expression: string;
      result: number;
      normalizedExpression: string;
    }
  > {}

export interface DictionaryOneboxResult
  extends OneboxBase<
    "dictionary",
    {
      term: string;
      partOfSpeech: string;
      definition: string;
      example?: string;
      synonyms: string[];
    }
  > {}

export type OneboxResult =
  | WeatherOneboxResult
  | StockOneboxResult
  | CalculatorOneboxResult
  | DictionaryOneboxResult;

export interface IntentResolver<
  TIntent extends ResolverIntent = ResolverIntent,
  TResult extends OneboxResult = OneboxResult
> {
  id: string;
  intent: TIntent;
  priority: number;
  resolve(
    query: string,
    detection: IntentDetectionResult,
    context: Required<ResolveContext>
  ): Promise<TResult | null>;
}

export interface ResolveOutcome {
  query: string;
  detection: IntentDetectionResult;
  result: OneboxResult | null;
  attempts: ResolveAttempt[];
  failureReason?: string;
}

export interface FrameworkOptions {
  minDetectConfidence?: number;
  minResolverConfidence?: number;
  fallbackOrder?: ResolverIntent[];
}

export interface IntentDetector {
  detect(query: string, options?: DetectionOptions): IntentDetectionResult;
}
