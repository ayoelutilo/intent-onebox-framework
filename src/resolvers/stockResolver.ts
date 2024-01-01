import { IntentResolver, StockOneboxResult } from "../types";

const STOCK_FIXTURES: Record<
  string,
  {
    price: number;
    changePercent: number;
    marketState: "open" | "closed";
  }
> = {
  SYMA: { price: 101.11, changePercent: 1.24, marketState: "closed" },
  SYMB: { price: 202.22, changePercent: -0.48, marketState: "closed" },
  SYMC: { price: 303.33, changePercent: 2.12, marketState: "closed" },
  SYMD: { price: 404.44, changePercent: -1.91, marketState: "closed" }
};

const COMPANY_ALIASES: Record<string, string> = {
  alphacorp: "SYMA",
  betaworks: "SYMB",
  gammatech: "SYMC",
  deltadynamics: "SYMD"
};

function extractSymbol(query: string): string | null {
  const rawTicker = query.match(/\$?([A-Za-z]{1,5})\b/g);
  if (rawTicker) {
    for (const match of rawTicker) {
      const symbol = match.replace(/^\$/, "").toUpperCase();
      if (STOCK_FIXTURES[symbol]) {
        return symbol;
      }
    }
  }

  const normalized = query.toLowerCase();
  for (const [alias, symbol] of Object.entries(COMPANY_ALIASES)) {
    const aliasPattern = new RegExp(`\\b${alias}\\b`);
    if (aliasPattern.test(normalized)) {
      return symbol;
    }
  }

  return null;
}

export class InMemoryStockResolver implements IntentResolver<"stock", StockOneboxResult> {
  readonly id = "stock:in-memory";
  readonly intent = "stock" as const;
  readonly priority: number;

  constructor(priority = 85) {
    this.priority = priority;
  }

  async resolve(query: string): Promise<StockOneboxResult | null> {
    const symbol = extractSymbol(query);
    const hasStockHint = /(stock|quote|shares|ticker|price|market|earnings|dividend)/i.test(query);
    if (!hasStockHint && !symbol) {
      return null;
    }

    if (!symbol) {
      return null;
    }

    const stock = STOCK_FIXTURES[symbol];
    if (!stock) {
      return null;
    }

    return {
      intent: "stock",
      confidence: 0.8,
      source: "stock-fixture",
      summary: `${symbol} ${stock.price.toFixed(2)} USD (${stock.changePercent.toFixed(2)}%)`,
      data: {
        symbol,
        price: stock.price,
        currency: "USD",
        changePercent: stock.changePercent,
        marketState: stock.marketState
      }
    };
  }
}

// Refinement.
