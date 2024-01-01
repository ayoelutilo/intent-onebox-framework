import { CalculatorOneboxResult, IntentResolver } from "../types";

const OPERATOR_PRECEDENCE: Record<string, number> = {
  "+": 1,
  "-": 1,
  "*": 2,
  "/": 2
};

function tokenizeExpression(expression: string): string[] {
  const normalized = expression.replace(/\s+/g, "");
  const tokens: string[] = [];
  let current = "";

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];

    if (/\d|\./.test(char)) {
      current += char;
      continue;
    }

    if (current) {
      tokens.push(current);
      current = "";
    }

    if (/[()+\-*/]/.test(char)) {
      const previous = tokens[tokens.length - 1];
      const isUnaryMinus = char === "-" && (!previous || /[()+\-*/]/.test(previous));
      if (isUnaryMinus) {
        current = "-";
      } else {
        tokens.push(char);
      }
      continue;
    }

    throw new Error(`Unsupported token: ${char}`);
  }

  if (current) {
    tokens.push(current);
  }

  return tokens;
}

function toRpn(tokens: string[]): string[] {
  const output: string[] = [];
  const operators: string[] = [];

  for (const token of tokens) {
    if (/^-?\d+(\.\d+)?$/.test(token)) {
      output.push(token);
      continue;
    }

    if (token === "(") {
      operators.push(token);
      continue;
    }

    if (token === ")") {
      while (operators.length > 0 && operators[operators.length - 1] !== "(") {
        output.push(operators.pop() as string);
      }
      if (operators.pop() !== "(") {
        throw new Error("Mismatched parentheses");
      }
      continue;
    }

    if (!OPERATOR_PRECEDENCE[token]) {
      throw new Error(`Unsupported operator: ${token}`);
    }

    while (
      operators.length > 0 &&
      OPERATOR_PRECEDENCE[operators[operators.length - 1]] >= OPERATOR_PRECEDENCE[token]
    ) {
      output.push(operators.pop() as string);
    }

    operators.push(token);
  }

  while (operators.length > 0) {
    const nextOperator = operators.pop() as string;
    if (nextOperator === "(" || nextOperator === ")") {
      throw new Error("Mismatched parentheses");
    }
    output.push(nextOperator);
  }

  return output;
}

function evaluateRpn(tokens: string[]): number {
  const stack: number[] = [];

  for (const token of tokens) {
    if (/^-?\d+(\.\d+)?$/.test(token)) {
      stack.push(Number(token));
      continue;
    }

    const right = stack.pop();
    const left = stack.pop();
    if (left === undefined || right === undefined) {
      throw new Error("Invalid expression");
    }

    switch (token) {
      case "+":
        stack.push(left + right);
        break;
      case "-":
        stack.push(left - right);
        break;
      case "*":
        stack.push(left * right);
        break;
      case "/":
        if (right === 0) {
          throw new Error("Division by zero");
        }
        stack.push(left / right);
        break;
      default:
        throw new Error(`Unsupported operator ${token}`);
    }
  }

  if (stack.length !== 1) {
    throw new Error("Invalid expression");
  }

  return stack[0];
}

function extractExpression(query: string): string | null {
  const normalized = query
    .toLowerCase()
    .replace(/\b(what is|calculate|compute|evaluate|result of)\b/g, " ")
    .trim();

  const match = normalized.match(/[-+*/().\d\s]+/g);
  if (!match) {
    return null;
  }

  const candidate = match.join(" ").replace(/\s+/g, "").trim();
  if (!candidate || !/[+\-*/]/.test(candidate) || !/\d/.test(candidate)) {
    return null;
  }

  if (!/^[-+*/().\d]+$/.test(candidate)) {
    return null;
  }

  return candidate;
}

export class SafeCalculatorResolver
  implements IntentResolver<"calculator", CalculatorOneboxResult>
{
  readonly id = "calculator:safe-parser";
  readonly intent = "calculator" as const;
  readonly priority: number;

  constructor(priority = 100) {
    this.priority = priority;
  }

  async resolve(query: string): Promise<CalculatorOneboxResult | null> {
    const expression = extractExpression(query);
    if (!expression) {
      return null;
    }

    const tokens = tokenizeExpression(expression);
    const rpn = toRpn(tokens);
    const result = evaluateRpn(rpn);

    return {
      intent: "calculator",
      confidence: 0.95,
      source: "safe-expression-parser",
      summary: `${expression} = ${result}`,
      data: {
        expression,
        normalizedExpression: tokens.join(" "),
        result: Number(result.toFixed(8))
      }
    };
  }
}

// Refinement.
