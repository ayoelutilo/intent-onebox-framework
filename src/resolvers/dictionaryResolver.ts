import { DictionaryOneboxResult, IntentResolver } from "../types";

const DICTIONARY_FIXTURES: Record<
  string,
  {
    partOfSpeech: string;
    definition: string;
    example?: string;
    synonyms: string[];
  }
> = {
  volatility: {
    partOfSpeech: "noun",
    definition: "The degree of variation in a value over time.",
    example: "High volatility often implies larger price swings.",
    synonyms: ["instability", "variance", "fluctuation"]
  },
  latency: {
    partOfSpeech: "noun",
    definition: "The delay between an input and the observable response.",
    example: "Low latency is critical for real-time audio systems.",
    synonyms: ["delay", "lag"]
  },
  throughput: {
    partOfSpeech: "noun",
    definition: "The amount of work processed in a given interval.",
    example: "Batch size changes can increase throughput.",
    synonyms: ["capacity", "bandwidth"]
  },
  hedge: {
    partOfSpeech: "verb",
    definition: "To reduce risk by taking an offsetting position.",
    example: "The fund hedged currency exposure with futures.",
    synonyms: ["offset", "insure", "protect"]
  }
};

function extractTerm(query: string): string | null {
  const normalized = query.toLowerCase().trim();

  const patterns = [
    /define\s+([a-z-]+)/,
    /meaning of\s+([a-z-]+)/,
    /what does\s+([a-z-]+)\s+mean/
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  const tokens = normalized.replace(/[^a-z\s-]+/g, " ").split(/\s+/).filter(Boolean);
  if (tokens.length === 1) {
    return tokens[0];
  }

  return null;
}

export class InMemoryDictionaryResolver
  implements IntentResolver<"dictionary", DictionaryOneboxResult>
{
  readonly id = "dictionary:in-memory";
  readonly intent = "dictionary" as const;
  readonly priority: number;

  constructor(priority = 80) {
    this.priority = priority;
  }

  async resolve(query: string): Promise<DictionaryOneboxResult | null> {
    if (!/(define|meaning|definition|synonym|what does)/i.test(query)) {
      const direct = extractTerm(query);
      if (!direct) {
        return null;
      }
    }

    const term = extractTerm(query);
    if (!term) {
      return null;
    }

    const entry = DICTIONARY_FIXTURES[term];
    if (!entry) {
      return null;
    }

    return {
      intent: "dictionary",
      confidence: 0.76,
      source: "dictionary-fixture",
      summary: `${term}: ${entry.definition}`,
      data: {
        term,
        partOfSpeech: entry.partOfSpeech,
        definition: entry.definition,
        example: entry.example,
        synonyms: entry.synonyms
      }
    };
  }
}
