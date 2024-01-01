import {
  DetectionOptions,
  IntentCandidate,
  IntentDetectionResult,
  IntentDetector,
  ResolverIntent
} from "./types";

const WEATHER_KEYWORDS = [
  "weather",
  "forecast",
  "temperature",
  "rain",
  "snow",
  "wind",
  "humidity",
  "storm",
  "celsius",
  "fahrenheit"
];

const STOCK_KEYWORDS = [
  "stock",
  "quote",
  "shares",
  "ticker",
  "market",
  "price",
  "earnings",
  "dividend"
];

const CALCULATOR_KEYWORDS = [
  "calculate",
  "compute",
  "evaluate",
  "sum",
  "difference",
  "product",
  "quotient",
  "sqrt",
  "log"
];

const DICTIONARY_KEYWORDS = [
  "define",
  "definition",
  "meaning",
  "synonym",
  "antonym",
  "etymology",
  "what does"
];

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function keywordHits(query: string, dictionary: string[]): string[] {
  return dictionary.filter((keyword) => {
    const pattern = new RegExp(`\\b${escapeRegex(keyword)}\\b`);
    return pattern.test(query);
  });
}

function hasMathExpression(query: string): boolean {
  return /\d+\s*[+\-*/]\s*\d+/.test(query) || /[()]\s*[+\-*/]/.test(query);
}

function tickerHits(rawQuery: string): string[] {
  const matches = rawQuery.match(/\$?[A-Z]{1,5}\b/g);
  if (!matches) {
    return [];
  }

  return matches.map((match) => match.replace(/^\$/, ""));
}

function weatherScore(normalized: string): IntentCandidate {
  const signals: string[] = [];
  let score = 0;

  const hits = keywordHits(normalized, WEATHER_KEYWORDS);
  if (hits.length > 0) {
    score += 0.5;
    signals.push(`weather_keywords:${hits.join(",")}`);
  }

  if (/(in|for|at)\s+[a-z]+/.test(normalized)) {
    score += 0.2;
    signals.push("location_pattern");
  }

  if (/(today|tomorrow|tonight|this week|weekend)/.test(normalized)) {
    score += 0.12;
    signals.push("time_reference");
  }

  if (hasMathExpression(normalized)) {
    score -= 0.2;
    signals.push("math_penalty");
  }

  return {
    intent: "weather",
    confidence: clamp(score),
    signals
  };
}

function stockScore(raw: string, normalized: string): IntentCandidate {
  const signals: string[] = [];
  let score = 0;

  const hits = keywordHits(normalized, STOCK_KEYWORDS);
  if (hits.length > 0) {
    score += 0.42;
    signals.push(`stock_keywords:${hits.join(",")}`);
  }

  const tickers = tickerHits(raw);
  if (tickers.length > 0) {
    score += 0.4;
    signals.push(`ticker:${tickers[0]}`);
  }

  if (/(price of|how is|trading at)/.test(normalized)) {
    score += 0.14;
    signals.push("price_phrase");
  }

  if (/\bdefine\b|\bmeaning\b|\bwhat does\b/.test(normalized)) {
    score -= 0.18;
    signals.push("dictionary_penalty");
  }

  if (hasMathExpression(normalized) && hits.length === 0) {
    score -= 0.1;
    signals.push("math_penalty");
  }

  return {
    intent: "stock",
    confidence: clamp(score),
    signals
  };
}

function calculatorScore(normalized: string): IntentCandidate {
  const signals: string[] = [];
  let score = 0;

  if (hasMathExpression(normalized)) {
    score += 0.68;
    signals.push("math_expression");
  }

  const hits = keywordHits(normalized, CALCULATOR_KEYWORDS);
  if (hits.length > 0) {
    score += 0.28;
    signals.push(`calculator_keywords:${hits.join(",")}`);
  }

  if (/^what is\s+/.test(normalized) && /\d/.test(normalized)) {
    score += 0.1;
    signals.push("what_is_numeric");
  }

  if (/\bdefine\b|\bmeaning\b/.test(normalized)) {
    score -= 0.2;
    signals.push("dictionary_penalty");
  }

  return {
    intent: "calculator",
    confidence: clamp(score),
    signals
  };
}

function dictionaryScore(raw: string, normalized: string): IntentCandidate {
  const signals: string[] = [];
  let score = 0;

  const hits = keywordHits(normalized, DICTIONARY_KEYWORDS);
  if (hits.length > 0) {
    score += 0.58;
    signals.push(`dictionary_keywords:${hits.join(",")}`);
  }

  if (/what does\s+[a-z-]+\s+mean/.test(normalized)) {
    score += 0.2;
    signals.push("what_does_mean_pattern");
  }

  const cleaned = normalized.replace(/[^a-z\s-]+/g, " ").trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 1 && words[0].length >= 4) {
    score += 0.24;
    signals.push("single_word_query");
  }

  if (tickerHits(raw).length > 0) {
    score -= 0.14;
    signals.push("ticker_penalty");
  }

  if (hasMathExpression(normalized)) {
    score -= 0.25;
    signals.push("math_penalty");
  }

  return {
    intent: "dictionary",
    confidence: clamp(score),
    signals
  };
}

export class HeuristicIntentDetector implements IntentDetector {
  detect(query: string, options: DetectionOptions = {}): IntentDetectionResult {
    const minConfidence = options.minConfidence ?? 0.34;
    const normalized = query.toLowerCase().trim();

    const intentScores: IntentCandidate[] = [
      weatherScore(normalized),
      stockScore(query, normalized),
      calculatorScore(normalized),
      dictionaryScore(query, normalized)
    ].sort((left, right) => right.confidence - left.confidence);

    if (intentScores.length > 1) {
      const top = intentScores[0];
      const runnerUp = intentScores[1];
      const margin = top.confidence - runnerUp.confidence;

      if (margin < 0.08 && top.confidence < 0.82) {
        top.confidence = clamp(top.confidence - 0.06);
        top.signals.push(`ambiguity_penalty:${runnerUp.intent}`);
      }

      intentScores.sort((left, right) => right.confidence - left.confidence);
    }

    const best = intentScores[0];
    const topIntent = best.confidence >= minConfidence ? best.intent : "unknown";
    const topConfidence = topIntent === "unknown" ? clamp(1 - best.confidence) : best.confidence;

    const unknownCandidate: IntentCandidate = {
      intent: "unknown",
      confidence: topIntent === "unknown" ? topConfidence : clamp(0.2 + (1 - best.confidence) * 0.25),
      signals: topIntent === "unknown" ? ["no_intent_above_threshold"] : ["fallback_guard"]
    };

    return {
      query,
      normalizedQuery: normalized,
      topIntent,
      topConfidence,
      candidates: [...intentScores, unknownCandidate]
    };
  }
}

export function detectIntent(query: string, options: DetectionOptions = {}) {
  return new HeuristicIntentDetector().detect(query, options);
}

export const DEFAULT_FALLBACK_ORDER: ResolverIntent[] = [
  "calculator",
  "dictionary",
  "stock",
  "weather"
];

// Refinement.
