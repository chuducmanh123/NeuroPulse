/**
 * Pure TypeScript safe mathematical expression parser, validator, and evaluator.
 * Zero `eval`, zero `Function`, zero `node:*` imports.
 *
 * Supported operators (by precedence):
 *   1. Comparisons: `<`, `<=`, `>`, `>=`, `==`, `!=` (returns 1 or 0)
 *   2. Addition/subtraction: `+`, `-`
 *   3. Multiplication/division: `*`, `/`
 *   4. Unary: `+`, `-`
 *   5. Exponentiation (right-associative): `^`
 *
 * Supported functions (case-insensitive):
 *   min(...), max(...), abs(x), sqrt(x), floor(x), ceil(x),
 *   round(x[, decimals]), pow(base, exp), ln(x), log10(x), exp(x),
 *   if(cond, whenTrue, whenFalse)
 */

export interface ExpressionValidationResult {
  valid: boolean;
  error?: string;
  variables: string[];
}

type TokenType = "number" | "ident" | "op" | "lparen" | "rparen" | "comma";

interface Token {
  type: TokenType;
  value: string;
  pos: number;
}

type AstNode =
  | { kind: "number"; value: number }
  | { kind: "var"; name: string }
  | { kind: "unary"; op: "+" | "-"; arg: AstNode }
  | { kind: "binary"; op: string; left: AstNode; right: AstNode }
  | { kind: "call"; name: string; args: AstNode[] };

const FUNCTION_ARITY: Record<string, { min: number; max: number }> = {
  min: { min: 1, max: 32 },
  max: { min: 1, max: 32 },
  abs: { min: 1, max: 1 },
  sqrt: { min: 1, max: 1 },
  floor: { min: 1, max: 1 },
  ceil: { min: 1, max: 1 },
  round: { min: 1, max: 2 },
  pow: { min: 2, max: 2 },
  ln: { min: 1, max: 1 },
  log10: { min: 1, max: 1 },
  exp: { min: 1, max: 1 },
  if: { min: 3, max: 3 },
};

const COMPARISON_OPS = new Set(["<", "<=", ">", ">=", "==", "!="]);

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const ch = input[i];
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }
    if (ch === "(") {
      tokens.push({ type: "lparen", value: "(", pos: i });
      i += 1;
      continue;
    }
    if (ch === ")") {
      tokens.push({ type: "rparen", value: ")", pos: i });
      i += 1;
      continue;
    }
    if (ch === ",") {
      tokens.push({ type: "comma", value: ",", pos: i });
      i += 1;
      continue;
    }

    const twoChar = input.slice(i, i + 2);
    if (
      twoChar === "<=" ||
      twoChar === ">=" ||
      twoChar === "==" ||
      twoChar === "!="
    ) {
      tokens.push({ type: "op", value: twoChar, pos: i });
      i += 2;
      continue;
    }

    if ("+-*/^<>".includes(ch)) {
      tokens.push({ type: "op", value: ch, pos: i });
      i += 1;
      continue;
    }

    if (/[0-9.]/.test(ch)) {
      const start = i;
      let sawDot = ch === ".";
      i += 1;
      while (i < input.length) {
        const next = input[i];
        if (/[0-9]/.test(next)) {
          i += 1;
        } else if (next === "." && !sawDot) {
          sawDot = true;
          i += 1;
        } else {
          break;
        }
      }
      const raw = input.slice(start, i);
      if (raw === "." || Number.isNaN(Number(raw))) {
        throw new Error(`Invalid number '${raw}' at position ${start + 1}`);
      }
      tokens.push({ type: "number", value: raw, pos: start });
      continue;
    }

    if (/[a-zA-Z_]/.test(ch)) {
      const start = i;
      i += 1;
      while (i < input.length && /[a-zA-Z0-9_]/.test(input[i])) {
        i += 1;
      }
      tokens.push({ type: "ident", value: input.slice(start, i), pos: start });
      continue;
    }

    throw new Error(`Unexpected character '${ch}' at position ${i + 1}`);
  }

  return tokens;
}

class Parser {
  private readonly tokens: Token[];
  private pos = 0;
  readonly variables = new Set<string>();

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private consume(): Token {
    const tok = this.tokens[this.pos];
    this.pos += 1;
    return tok;
  }

  parse(): AstNode {
    if (this.tokens.length === 0) {
      throw new Error("Expression cannot be empty");
    }
    const node = this.parseComparison();
    if (this.pos < this.tokens.length) {
      const extra = this.tokens[this.pos];
      throw new Error(
        `Unexpected token '${extra.value}' at position ${extra.pos + 1}`
      );
    }
    return node;
  }

  private parseComparison(): AstNode {
    let left = this.parseAddSub();
    while (true) {
      const tok = this.peek();
      if (tok && tok.type === "op" && COMPARISON_OPS.has(tok.value)) {
        this.consume();
        const right = this.parseAddSub();
        left = { kind: "binary", op: tok.value, left, right };
      } else {
        break;
      }
    }
    return left;
  }

  private parseAddSub(): AstNode {
    let left = this.parseMulDiv();
    while (true) {
      const tok = this.peek();
      if (tok && tok.type === "op" && (tok.value === "+" || tok.value === "-")) {
        this.consume();
        const right = this.parseMulDiv();
        left = { kind: "binary", op: tok.value, left, right };
      } else {
        break;
      }
    }
    return left;
  }

  private parseMulDiv(): AstNode {
    let left = this.parseUnary();
    while (true) {
      const tok = this.peek();
      if (tok && tok.type === "op" && (tok.value === "*" || tok.value === "/")) {
        this.consume();
        const right = this.parseUnary();
        left = { kind: "binary", op: tok.value, left, right };
      } else {
        break;
      }
    }
    return left;
  }

  private parseUnary(): AstNode {
    const tok = this.peek();
    if (tok && tok.type === "op" && (tok.value === "+" || tok.value === "-")) {
      this.consume();
      const arg = this.parseUnary();
      return { kind: "unary", op: tok.value, arg };
    }
    return this.parsePower();
  }

  private parsePower(): AstNode {
    const base = this.parsePrimary();
    const tok = this.peek();
    if (tok && tok.type === "op" && tok.value === "^") {
      this.consume();
      const exponent = this.parseUnary();
      return { kind: "binary", op: "^", left: base, right: exponent };
    }
    return base;
  }

  private parsePrimary(): AstNode {
    const tok = this.peek();
    if (!tok) {
      throw new Error("Unexpected end of expression");
    }

    if (tok.type === "number") {
      this.consume();
      return { kind: "number", value: Number(tok.value) };
    }

    if (tok.type === "lparen") {
      this.consume();
      const expr = this.parseComparison();
      const close = this.peek();
      if (!close || close.type !== "rparen") {
        throw new Error("Missing closing parenthesis ')'");
      }
      this.consume();
      return expr;
    }

    if (tok.type === "ident") {
      this.consume();
      const next = this.peek();
      if (next && next.type === "lparen") {
        const fnName = tok.value.toLowerCase();
        const arity = FUNCTION_ARITY[fnName];
        if (!arity) {
          throw new Error(`Unknown function '${tok.value}'`);
        }
        this.consume(); // consume '('
        const args: AstNode[] = [];
        const afterOpen = this.peek();
        if (afterOpen && afterOpen.type === "rparen") {
          this.consume();
        } else {
          while (true) {
            args.push(this.parseComparison());
            const sep = this.peek();
            if (!sep) {
              throw new Error(`Missing ')' for function '${tok.value}'`);
            }
            if (sep.type === "comma") {
              this.consume();
              continue;
            }
            if (sep.type === "rparen") {
              this.consume();
              break;
            }
            throw new Error(
              `Expected ',' or ')' in function '${tok.value}', got '${sep.value}'`
            );
          }
        }
        if (args.length < arity.min || args.length > arity.max) {
          throw new Error(
            arity.min === arity.max
              ? `Function '${fnName}' expects ${arity.min} argument(s), got ${args.length}`
              : `Function '${fnName}' expects ${arity.min}–${arity.max} arguments, got ${args.length}`
          );
        }
        return { kind: "call", name: fnName, args };
      }

      this.variables.add(tok.value);
      return { kind: "var", name: tok.value };
    }

    throw new Error(
      `Unexpected token '${tok.value}' at position ${tok.pos + 1}`
    );
  }
}

function evalAst(node: AstNode, variables: Record<string, number>): number | null {
  switch (node.kind) {
    case "number":
      return Number.isFinite(node.value) ? node.value : null;

    case "var": {
      const val = variables[node.name];
      return typeof val === "number" && Number.isFinite(val) ? val : null;
    }

    case "unary": {
      const v = evalAst(node.arg, variables);
      if (v === null) return null;
      return node.op === "-" ? -v : v;
    }

    case "binary": {
      const left = evalAst(node.left, variables);
      const right = evalAst(node.right, variables);
      if (left === null || right === null) return null;

      let out: number;
      switch (node.op) {
        case "+":
          out = left + right;
          break;
        case "-":
          out = left - right;
          break;
        case "*":
          out = left * right;
          break;
        case "/":
          if (right === 0) return null;
          out = left / right;
          break;
        case "^":
          out = Math.pow(left, right);
          break;
        case "<":
          out = left < right ? 1 : 0;
          break;
        case "<=":
          out = left <= right ? 1 : 0;
          break;
        case ">":
          out = left > right ? 1 : 0;
          break;
        case ">=":
          out = left >= right ? 1 : 0;
          break;
        case "==":
          out = left === right ? 1 : 0;
          break;
        case "!=":
          out = left !== right ? 1 : 0;
          break;
        default:
          return null;
      }
      return Number.isFinite(out) ? out : null;
    }

    case "call": {
      if (node.name === "if") {
        const cond = evalAst(node.args[0], variables);
        if (cond === null) return null;
        return cond !== 0
          ? evalAst(node.args[1], variables)
          : evalAst(node.args[2], variables);
      }

      const evaluatedArgs: number[] = [];
      for (const arg of node.args) {
        const v = evalAst(arg, variables);
        if (v === null) return null;
        evaluatedArgs.push(v);
      }

      let out: number;
      switch (node.name) {
        case "min":
          out = Math.min(...evaluatedArgs);
          break;
        case "max":
          out = Math.max(...evaluatedArgs);
          break;
        case "abs":
          out = Math.abs(evaluatedArgs[0]);
          break;
        case "sqrt":
          if (evaluatedArgs[0] < 0) return null;
          out = Math.sqrt(evaluatedArgs[0]);
          break;
        case "floor":
          out = Math.floor(evaluatedArgs[0]);
          break;
        case "ceil":
          out = Math.ceil(evaluatedArgs[0]);
          break;
        case "round": {
          const decimals = evaluatedArgs[1] ?? 0;
          const factor = Math.pow(10, Math.trunc(decimals));
          if (!Number.isFinite(factor) || factor <= 0) return null;
          out = Math.round((evaluatedArgs[0] + Number.EPSILON) * factor) / factor;
          break;
        }
        case "pow":
          out = Math.pow(evaluatedArgs[0], evaluatedArgs[1]);
          break;
        case "ln":
          if (evaluatedArgs[0] <= 0) return null;
          out = Math.log(evaluatedArgs[0]);
          break;
        case "log10":
          if (evaluatedArgs[0] <= 0) return null;
          out = Math.log10(evaluatedArgs[0]);
          break;
        case "exp":
          out = Math.exp(evaluatedArgs[0]);
          break;
        default:
          return null;
      }
      return Number.isFinite(out) ? out : null;
    }
  }
}

export function validateExpression(
  expr: string,
  allowedVariables?: ReadonlySet<string>
): ExpressionValidationResult {
  if (typeof expr !== "string" || !expr.trim()) {
    return {
      valid: false,
      error: "Expression cannot be empty",
      variables: [],
    };
  }

  try {
    const tokens = tokenize(expr);
    const parser = new Parser(tokens);
    parser.parse();
    const vars = Array.from(parser.variables);

    if (allowedVariables) {
      const unknown = vars.filter((v) => !allowedVariables.has(v));
      if (unknown.length > 0) {
        return {
          valid: false,
          error: `Unknown item variable(s): ${unknown.join(", ")}`,
          variables: vars,
        };
      }
    }

    return { valid: true, variables: vars };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : "Invalid expression",
      variables: [],
    };
  }
}

export function evaluateExpression(
  expr: string,
  variables: Record<string, number>
): number | null {
  if (typeof expr !== "string" || !expr.trim()) return null;
  try {
    const tokens = tokenize(expr);
    const parser = new Parser(tokens);
    const ast = parser.parse();
    return evalAst(ast, variables);
  } catch {
    return null;
  }
}
