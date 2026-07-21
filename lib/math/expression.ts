import { z } from "zod";

export type RationalSpec = { numerator: number; denominator: number };
export type ExpressionAst =
  | { type: "rational"; numerator: number; denominator: number }
  | { type: "variable"; name: "x" }
  | { type: "add"; terms: ExpressionAst[] }
  | { type: "multiply"; factors: ExpressionAst[] }
  | { type: "divide"; numerator: ExpressionAst; denominator: ExpressionAst }
  | { type: "power"; base: ExpressionAst; exponent: number }
  | { type: "function"; name: "sin" | "cos" | "exp" | "ln"; argument: ExpressionAst };

export const RationalSpecSchema = z.object({
  numerator: z.number().int().min(-10_000).max(10_000),
  denominator: z.number().int().min(1).max(10_000),
}).strict();

export const ExpressionAstSchema: z.ZodType<ExpressionAst> = z.lazy(() => z.discriminatedUnion("type", [
  z.object({ type: z.literal("rational"), numerator: z.number().int().min(-10_000).max(10_000), denominator: z.number().int().min(1).max(10_000) }).strict(),
  z.object({ type: z.literal("variable"), name: z.literal("x") }).strict(),
  z.object({ type: z.literal("add"), terms: z.array(ExpressionAstSchema).min(2).max(8) }).strict(),
  z.object({ type: z.literal("multiply"), factors: z.array(ExpressionAstSchema).min(2).max(8) }).strict(),
  z.object({ type: z.literal("divide"), numerator: ExpressionAstSchema, denominator: ExpressionAstSchema }).strict(),
  z.object({ type: z.literal("power"), base: ExpressionAstSchema, exponent: z.number().int().min(0).max(6) }).strict(),
  z.object({ type: z.literal("function"), name: z.enum(["sin", "cos", "exp", "ln"]), argument: ExpressionAstSchema }).strict(),
]));

type Token = { type: "number" | "identifier" | "op" | "lparen" | "rparen" | "eof"; value: string };
type ParsedNode = ExpressionAst | { type: "negate"; value: ParsedNode } | { type: "subtract"; left: ParsedNode; right: ParsedNode };

function gcd(left: number, right: number): number {
  let a = Math.abs(left); let b = Math.abs(right);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

export function rational(numerator: number, denominator = 1): ExpressionAst {
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator) || denominator === 0) throw new Error("Invalid rational number.");
  const sign = denominator < 0 ? -1 : 1;
  const divisor = gcd(numerator, denominator);
  return { type: "rational", numerator: sign * numerator / divisor, denominator: Math.abs(denominator) / divisor };
}

const zero = () => rational(0);
const one = () => rational(1);
const isRational = (node: ExpressionAst): node is Extract<ExpressionAst, { type: "rational" }> => node.type === "rational";
const isZero = (node: ExpressionAst) => isRational(node) && node.numerator === 0;
const isOne = (node: ExpressionAst) => isRational(node) && node.numerator === node.denominator;

function normalizeInput(input: string) {
  return input
    .replaceAll("−", "-").replaceAll("×", "*").replaceAll("÷", "/")
    .replaceAll("²", "^2").replaceAll("³", "^3")
    .replace(/\\left|\\right/g, "").replace(/\\cdot|\\times/g, "*")
    .replace(/\blog\b/gi, "ln").trim();
}

function lex(input: string): Token[] {
  const clean = normalizeInput(input).replace(/\s+/g, "");
  if (!clean || clean.length > 180) throw new Error("Enter a short supported derivative expression.");
  const raw: Token[] = [];
  for (let index = 0; index < clean.length;) {
    const character = clean[index];
    if (/\d/.test(character)) {
      let value = character; index += 1;
      while (index < clean.length && /\d/.test(clean[index])) { value += clean[index]; index += 1; }
      raw.push({ type: "number", value }); continue;
    }
    if (/[a-zA-Z]/.test(character)) {
      let value = character; index += 1;
      while (index < clean.length && /[a-zA-Z]/.test(clean[index])) { value += clean[index]; index += 1; }
      value = value.toLowerCase();
      if (!["x", "sin", "cos", "exp", "ln"].includes(value)) throw new Error(`Unsupported identifier: ${value}`);
      raw.push({ type: "identifier", value }); continue;
    }
    if ("+-*/^".includes(character)) { raw.push({ type: "op", value: character }); index += 1; continue; }
    if (character === "(") { raw.push({ type: "lparen", value: character }); index += 1; continue; }
    if (character === ")") { raw.push({ type: "rparen", value: character }); index += 1; continue; }
    throw new Error(`Unsupported symbol: ${character}`);
  }
  const tokens: Token[] = [];
  for (const token of raw) {
    const previous = tokens.at(-1);
    const previousCanEnd = previous && ["number", "identifier", "rparen"].includes(previous.type) && previous.value !== "sin" && previous.value !== "cos" && previous.value !== "exp" && previous.value !== "ln";
    const nextCanStart = ["number", "identifier", "lparen"].includes(token.type);
    if (previousCanEnd && nextCanStart) tokens.push({ type: "op", value: "*" });
    tokens.push(token);
  }
  tokens.push({ type: "eof", value: "" });
  return tokens;
}

class Parser {
  private index = 0;
  constructor(private readonly tokens: Token[]) {}
  parse(): ParsedNode {
    const node = this.expression(0);
    if (this.peek().type !== "eof") throw new Error("Unexpected expression tail.");
    return node;
  }
  private peek() { return this.tokens[this.index]; }
  private take() { return this.tokens[this.index++]; }
  private expression(minBinding: number): ParsedNode {
    const first = this.take(); let left: ParsedNode;
    if (first.type === "number") left = rational(Number(first.value));
    else if (first.type === "identifier" && first.value === "x") left = { type: "variable", name: "x" };
    else if (first.type === "identifier") {
      if (this.take().type !== "lparen") throw new Error(`${first.value} requires parentheses.`);
      const argument = this.expression(0);
      if (this.take().type !== "rparen") throw new Error("Missing closing parenthesis.");
      left = { type: "function", name: first.value as "sin" | "cos" | "exp" | "ln", argument: finalize(argument) };
    } else if (first.type === "op" && first.value === "-") left = { type: "negate", value: this.expression(7) };
    else if (first.type === "lparen") {
      left = this.expression(0);
      if (this.take().type !== "rparen") throw new Error("Missing closing parenthesis.");
    } else throw new Error("Expected a number, x, a supported function, or parentheses.");
    while (this.peek().type === "op") {
      const operator = this.peek().value as "+" | "-" | "*" | "/" | "^";
      const binding: Record<typeof operator, [number, number]> = { "+": [1, 2], "-": [1, 2], "*": [3, 4], "/": [3, 4], "^": [6, 5] };
      const [leftBinding, rightBinding] = binding[operator];
      if (leftBinding < minBinding) break;
      this.take(); const right = this.expression(rightBinding);
      if (operator === "+") left = { type: "add", terms: [finalize(left), finalize(right)] };
      else if (operator === "-") left = { type: "subtract", left, right };
      else if (operator === "*") left = { type: "multiply", factors: [finalize(left), finalize(right)] };
      else if (operator === "/") left = { type: "divide", numerator: finalize(left), denominator: finalize(right) };
      else {
        const exponent = finalize(right);
        if (!isRational(exponent) || exponent.denominator !== 1 || exponent.numerator < 0 || exponent.numerator > 6) throw new Error("Exponent must be an integer from 0 to 6.");
        left = { type: "power", base: finalize(left), exponent: exponent.numerator };
      }
    }
    return left;
  }
}

function finalize(node: ParsedNode): ExpressionAst {
  if (node.type === "negate") return simplify({ type: "multiply", factors: [rational(-1), finalize(node.value)] });
  if (node.type === "subtract") return simplify({ type: "add", terms: [finalize(node.left), { type: "multiply", factors: [rational(-1), finalize(node.right)] }] });
  return simplify(node);
}

function compareAst(left: ExpressionAst, right: ExpressionAst) { return canonicalKey(left).localeCompare(canonicalKey(right)); }

export function simplify(node: ExpressionAst): ExpressionAst {
  if (node.type === "rational") return rational(node.numerator, node.denominator);
  if (node.type === "variable") return node;
  if (node.type === "function") return { ...node, argument: simplify(node.argument) };
  if (node.type === "power") {
    const base = simplify(node.base);
    if (node.exponent === 0) return one();
    if (node.exponent === 1) return base;
    if (isRational(base)) return rational(base.numerator ** node.exponent, base.denominator ** node.exponent);
    return { type: "power", base, exponent: node.exponent };
  }
  if (node.type === "divide") {
    const numerator = simplify(node.numerator); const denominator = simplify(node.denominator);
    if (isZero(denominator)) throw new Error("Division by zero is not allowed.");
    if (isZero(numerator)) return zero();
    if (isOne(denominator)) return numerator;
    if (isRational(numerator) && isRational(denominator)) return rational(numerator.numerator * denominator.denominator, numerator.denominator * denominator.numerator);
    return { type: "divide", numerator, denominator };
  }
  if (node.type === "add") {
    const terms = node.terms.flatMap((term) => { const value = simplify(term); return value.type === "add" ? value.terms : [value]; });
    let numerator = 0; let denominator = 1; const others: ExpressionAst[] = [];
    for (const term of terms) {
      if (!isRational(term)) { if (!isZero(term)) others.push(term); continue; }
      numerator = numerator * term.denominator + term.numerator * denominator; denominator *= term.denominator;
      const divisor = gcd(numerator, denominator); numerator /= divisor; denominator /= divisor;
    }
    if (numerator) others.push(rational(numerator, denominator));
    if (!others.length) return zero();
    if (others.length === 1) return others[0];
    return { type: "add", terms: others.sort(compareAst) };
  }
  const factors = node.factors.flatMap((factor) => { const value = simplify(factor); return value.type === "multiply" ? value.factors : [value]; });
  let numerator = 1; let denominator = 1; const others: ExpressionAst[] = [];
  for (const factor of factors) {
    if (isZero(factor)) return zero();
    if (!isRational(factor)) { if (!isOne(factor)) others.push(factor); continue; }
    numerator *= factor.numerator; denominator *= factor.denominator;
    const divisor = gcd(numerator, denominator); numerator /= divisor; denominator /= divisor;
  }
  if (numerator !== denominator || !others.length) others.push(rational(numerator, denominator));
  if (others.length === 1) return others[0];
  return { type: "multiply", factors: others.sort(compareAst) };
}

function metrics(node: ExpressionAst): { nodes: number; depth: number; functions: number } {
  const children = node.type === "add" ? node.terms : node.type === "multiply" ? node.factors : node.type === "divide" ? [node.numerator, node.denominator] : node.type === "power" ? [node.base] : node.type === "function" ? [node.argument] : [];
  const values = children.map(metrics);
  return { nodes: 1 + values.reduce((sum, value) => sum + value.nodes, 0), depth: 1 + Math.max(0, ...values.map((value) => value.depth)), functions: (node.type === "function" ? 1 : 0) + values.reduce((sum, value) => sum + value.functions, 0) };
}

export function validateExpressionAst(node: ExpressionAst) {
  const parsed = ExpressionAstSchema.parse(node); const value = metrics(parsed);
  if (value.nodes > 30 || value.depth > 6 || value.functions > 2) throw new Error("The expression is outside the supported derivative complexity.");
  return parsed;
}

export function parseMathExpression(input: string) { return validateExpressionAst(finalize(new Parser(lex(input)).parse())); }

export function differentiate(node: ExpressionAst): ExpressionAst {
  if (node.type === "rational") return zero();
  if (node.type === "variable") return one();
  if (node.type === "add") return simplify({ type: "add", terms: node.terms.map(differentiate) });
  if (node.type === "multiply") {
    const terms = node.factors.map((_, index) => ({ type: "multiply", factors: node.factors.map((factor, factorIndex) => factorIndex === index ? differentiate(factor) : factor) } as ExpressionAst));
    return simplify({ type: "add", terms });
  }
  if (node.type === "divide") return simplify({ type: "divide", numerator: { type: "add", terms: [
    { type: "multiply", factors: [differentiate(node.numerator), node.denominator] },
    { type: "multiply", factors: [rational(-1), node.numerator, differentiate(node.denominator)] },
  ] }, denominator: { type: "power", base: node.denominator, exponent: 2 } });
  if (node.type === "power") return simplify({ type: "multiply", factors: [rational(node.exponent), { type: "power", base: node.base, exponent: Math.max(0, node.exponent - 1) }, differentiate(node.base)] });
  const outer = node.name === "sin" ? { type: "function", name: "cos", argument: node.argument } as ExpressionAst
    : node.name === "cos" ? { type: "multiply", factors: [rational(-1), { type: "function", name: "sin", argument: node.argument }] } as ExpressionAst
      : node.name === "exp" ? node : { type: "divide", numerator: one(), denominator: node.argument } as ExpressionAst;
  return simplify({ type: "multiply", factors: [outer, differentiate(node.argument)] });
}

export function substituteExpression(node: ExpressionAst, value: RationalSpec): ExpressionAst {
  if (node.type === "variable") return rational(value.numerator, value.denominator);
  if (node.type === "rational") return node;
  if (node.type === "add") return simplify({ type: "add", terms: node.terms.map((term) => substituteExpression(term, value)) });
  if (node.type === "multiply") return simplify({ type: "multiply", factors: node.factors.map((factor) => substituteExpression(factor, value)) });
  if (node.type === "divide") return simplify({ type: "divide", numerator: substituteExpression(node.numerator, value), denominator: substituteExpression(node.denominator, value) });
  if (node.type === "power") return simplify({ type: "power", base: substituteExpression(node.base, value), exponent: node.exponent });
  const argument = substituteExpression(node.argument, value);
  if (isZero(argument) && (node.name === "sin" || node.name === "ln")) return node.name === "sin" ? zero() : { type: "function", name: "ln", argument };
  if (isZero(argument) && node.name === "cos") return one();
  if (isZero(argument) && node.name === "exp") return one();
  return { ...node, argument };
}

export function canonicalKey(node: ExpressionAst): string { return JSON.stringify(simplify(node)); }
export function expressionsEquivalent(left: ExpressionAst, right: ExpressionAst) { return canonicalKey(left) === canonicalKey(right); }

export function formatExpression(node: ExpressionAst, parentPrecedence = 0): string {
  if (node.type === "rational") return node.denominator === 1 ? String(node.numerator) : `${node.numerator}/${node.denominator}`;
  if (node.type === "variable") return "x";
  if (node.type === "function") return `${node.name}(${formatExpression(node.argument)})`;
  if (node.type === "power") return `${node.base.type === "add" || node.base.type === "multiply" || node.base.type === "divide" ? `(${formatExpression(node.base)})` : formatExpression(node.base)}^${node.exponent}`;
  if (node.type === "divide") {
    const value = `${formatExpression(node.numerator, 3)}/${formatExpression(node.denominator, 3)}`;
    return parentPrecedence > 2 ? `(${value})` : value;
  }
  if (node.type === "multiply") {
    const value = node.factors.map((factor) => formatExpression(factor, 3)).join("*");
    return parentPrecedence > 2 ? `(${value})` : value;
  }
  const value = node.terms.map((term, index) => {
    const formatted = formatExpression(term, 1);
    if (index && formatted.startsWith("-")) return ` - ${formatted.slice(1)}`;
    return index ? ` + ${formatted}` : formatted;
  }).join("");
  return parentPrecedence > 1 ? `(${value})` : value;
}

export type DerivativeCapability = "power" | "sum" | "product" | "quotient" | "chain" | "standard_function";

function dependsOnX(node: ExpressionAst): boolean {
  if (node.type === "variable") return true;
  if (node.type === "rational") return false;
  if (node.type === "add") return node.terms.some(dependsOnX);
  if (node.type === "multiply") return node.factors.some(dependsOnX);
  if (node.type === "divide") return dependsOnX(node.numerator) || dependsOnX(node.denominator);
  return dependsOnX(node.type === "power" ? node.base : node.argument);
}

export function classifyDerivativeCapability(node: ExpressionAst): DerivativeCapability {
  if (node.type === "divide") return "quotient";
  if (node.type === "multiply" && node.factors.filter(dependsOnX).length > 1) return "product";
  if (node.type === "power" && node.base.type !== "variable") return "chain";
  if (node.type === "function") return node.argument.type === "variable" ? "standard_function" : "chain";
  if (node.type === "add") return "sum";
  return "power";
}

export function evaluateExpression(node: ExpressionAst, x: number): number {
  if (node.type === "rational") return node.numerator / node.denominator;
  if (node.type === "variable") return x;
  if (node.type === "add") return node.terms.reduce((sum, term) => sum + evaluateExpression(term, x), 0);
  if (node.type === "multiply") return node.factors.reduce((product, factor) => product * evaluateExpression(factor, x), 1);
  if (node.type === "divide") return evaluateExpression(node.numerator, x) / evaluateExpression(node.denominator, x);
  if (node.type === "power") return evaluateExpression(node.base, x) ** node.exponent;
  const argument = evaluateExpression(node.argument, x);
  return node.name === "sin" ? Math.sin(argument) : node.name === "cos" ? Math.cos(argument) : node.name === "exp" ? Math.exp(argument) : Math.log(argument);
}
