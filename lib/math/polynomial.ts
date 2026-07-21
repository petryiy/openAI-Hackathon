export type Fraction = { n: bigint; d: bigint };
export type Polynomial = Map<string, Fraction>;

type Token = { type: "number" | "var" | "op" | "lparen" | "rparen" | "eof"; value: string };
type Node =
  | { type: "number"; value: Fraction }
  | { type: "var"; value: "x" | "h" }
  | { type: "binary"; op: "+" | "-" | "*" | "/" | "^"; left: Node; right: Node }
  | { type: "negate"; value: Node };

function gcd(a: bigint, b: bigint): bigint { return b === 0n ? (a < 0n ? -a : a) : gcd(b, a % b); }
function fraction(n: bigint, d = 1n): Fraction {
  if (d === 0n) throw new Error("Division by zero is not allowed.");
  const sign = d < 0n ? -1n : 1n;
  const divisor = gcd(n, d);
  return { n: (sign * n) / divisor, d: (sign * d) / divisor };
}
function addFraction(a: Fraction, b: Fraction) { return fraction(a.n * b.d + b.n * a.d, a.d * b.d); }
function multiplyFraction(a: Fraction, b: Fraction) { return fraction(a.n * b.n, a.d * b.d); }
function divideFraction(a: Fraction, b: Fraction) { return fraction(a.n * b.d, a.d * b.n); }

function lex(input: string): Token[] {
  const clean = input
    .replaceAll("−", "-").replaceAll("×", "*").replaceAll("÷", "/")
    .replace(/\\left|\\right/g, "").replace(/\\cdot|\\times/g, "*")
    .replace(/\s+/g, "");
  if (!clean || clean.length > 120) throw new Error("Enter a short polynomial expression.");
  const raw: Token[] = [];
  for (let i = 0; i < clean.length;) {
    const character = clean[i];
    if (/\d/.test(character)) {
      let value = character; i += 1;
      while (i < clean.length && /\d/.test(clean[i])) { value += clean[i]; i += 1; }
      raw.push({ type: "number", value }); continue;
    }
    if (character === "x" || character === "h") { raw.push({ type: "var", value: character }); i += 1; continue; }
    if ("+-*/^".includes(character)) { raw.push({ type: "op", value: character }); i += 1; continue; }
    if (character === "(") { raw.push({ type: "lparen", value: character }); i += 1; continue; }
    if (character === ")") { raw.push({ type: "rparen", value: character }); i += 1; continue; }
    throw new Error(`Unsupported symbol: ${character}`);
  }
  const tokens: Token[] = [];
  for (const token of raw) {
    const previous = tokens.at(-1);
    if (previous && ["number", "var", "rparen"].includes(previous.type) && ["number", "var", "lparen"].includes(token.type)) {
      tokens.push({ type: "op", value: "*" });
    }
    tokens.push(token);
  }
  tokens.push({ type: "eof", value: "" });
  return tokens;
}

class Parser {
  private index = 0;
  constructor(private readonly tokens: Token[]) {}
  parse(): Node {
    const node = this.expression(0);
    if (this.peek().type !== "eof") throw new Error("Unexpected expression tail.");
    return node;
  }
  private peek() { return this.tokens[this.index]; }
  private take() { return this.tokens[this.index++]; }
  private expression(minBinding: number): Node {
    const first = this.take();
    let left: Node;
    if (first.type === "number") left = { type: "number", value: fraction(BigInt(first.value)) };
    else if (first.type === "var") left = { type: "var", value: first.value as "x" | "h" };
    else if (first.type === "op" && first.value === "-") left = { type: "negate", value: this.expression(7) };
    else if (first.type === "lparen") {
      left = this.expression(0);
      if (this.take().type !== "rparen") throw new Error("Missing closing parenthesis.");
    } else throw new Error("Expected a number, variable, or parenthesis.");

    while (this.peek().type === "op") {
      const op = this.peek().value as "+" | "-" | "*" | "/" | "^";
      const binding: Record<typeof op, [number, number]> = { "+": [1, 2], "-": [1, 2], "*": [3, 4], "/": [3, 4], "^": [6, 5] };
      const [leftBinding, rightBinding] = binding[op];
      if (leftBinding < minBinding) break;
      this.take();
      left = { type: "binary", op, left, right: this.expression(rightBinding) };
    }
    return left;
  }
}

function monomialKey(x: number, h: number) { return `${x},${h}`; }
function parseKey(key: string) { const [x, h] = key.split(",").map(Number); return { x, h }; }
function cleanPolynomial(poly: Polynomial) {
  for (const [key, value] of poly) if (value.n === 0n) poly.delete(key);
  return poly;
}
function constant(value: Fraction): Polynomial { return value.n === 0n ? new Map() : new Map([[monomialKey(0, 0), value]]); }
function addPoly(a: Polynomial, b: Polynomial, sign = 1n) {
  const result = new Map(a);
  for (const [key, value] of b) result.set(key, addFraction(result.get(key) ?? fraction(0n), fraction(sign * value.n, value.d)));
  return cleanPolynomial(result);
}
function multiplyPoly(a: Polynomial, b: Polynomial) {
  const result: Polynomial = new Map();
  for (const [ak, av] of a) for (const [bk, bv] of b) {
    const ae = parseKey(ak); const be = parseKey(bk);
    if (ae.x + be.x > 3 || ae.h + be.h > 3 || ae.x + ae.h + be.x + be.h > 3) throw new Error("Only polynomials up to degree three are supported.");
    const key = monomialKey(ae.x + be.x, ae.h + be.h);
    result.set(key, addFraction(result.get(key) ?? fraction(0n), multiplyFraction(av, bv)));
  }
  return cleanPolynomial(result);
}
function dividePoly(a: Polynomial, b: Polynomial) {
  if (b.size !== 1) throw new Error("Division is only allowed by a single term.");
  const [[key, coefficient]] = [...b]; const divisor = parseKey(key);
  const result: Polynomial = new Map();
  for (const [ak, value] of a) {
    const exponent = parseKey(ak);
    if (exponent.x < divisor.x || exponent.h < divisor.h) throw new Error("The division does not simplify to a polynomial.");
    result.set(monomialKey(exponent.x - divisor.x, exponent.h - divisor.h), divideFraction(value, coefficient));
  }
  return cleanPolynomial(result);
}
function evaluate(node: Node): Polynomial {
  if (node.type === "number") return constant(node.value);
  if (node.type === "var") return new Map([[node.value === "x" ? monomialKey(1, 0) : monomialKey(0, 1), fraction(1n)]]);
  if (node.type === "negate") return addPoly(new Map(), evaluate(node.value), -1n);
  if (node.op === "+") return addPoly(evaluate(node.left), evaluate(node.right));
  if (node.op === "-") return addPoly(evaluate(node.left), evaluate(node.right), -1n);
  if (node.op === "*") return multiplyPoly(evaluate(node.left), evaluate(node.right));
  if (node.op === "/") return dividePoly(evaluate(node.left), evaluate(node.right));
  const exponentPoly = evaluate(node.right);
  if (exponentPoly.size !== 1 || !exponentPoly.has(monomialKey(0, 0))) throw new Error("Exponent must be an integer from 0 to 3.");
  const exponent = exponentPoly.get(monomialKey(0, 0))!;
  if (exponent.d !== 1n || exponent.n < 0n || exponent.n > 3n) throw new Error("Exponent must be an integer from 0 to 3.");
  let result = constant(fraction(1n)); const base = evaluate(node.left);
  for (let i = 0; i < Number(exponent.n); i += 1) result = multiplyPoly(result, base);
  return result;
}

export function parsePolynomial(input: string): Polynomial { return evaluate(new Parser(lex(input)).parse()); }
export function polynomialEquals(a: Polynomial, b: Polynomial) {
  const keys = new Set([...a.keys(), ...b.keys()]);
  return [...keys].every((key) => {
    const av = a.get(key) ?? fraction(0n); const bv = b.get(key) ?? fraction(0n);
    return av.n === bv.n && av.d === bv.d;
  });
}
export function formatPolynomial(poly: Polynomial) {
  if (poly.size === 0) return "0";
  const terms = [...poly.entries()].sort(([ak], [bk]) => {
    const a = parseKey(ak); const b = parseKey(bk); return (b.x + b.h) - (a.x + a.h) || b.x - a.x;
  });
  return terms.map(([key, value], index) => {
    const { x, h } = parseKey(key);
    const negative = value.n < 0n; const absolute = fraction(value.n < 0n ? -value.n : value.n, value.d);
    const variable = `${x ? `x${x > 1 ? `^${x}` : ""}` : ""}${h ? `h${h > 1 ? `^${h}` : ""}` : ""}`;
    const coefficient = absolute.n === absolute.d && variable ? "" : absolute.d === 1n ? String(absolute.n) : `${absolute.n}/${absolute.d}`;
    return `${index === 0 ? (negative ? "-" : "") : negative ? " - " : " + "}${coefficient}${coefficient && variable ? "*" : ""}${variable}`;
  }).join("");
}

export function polynomialCoefficients(poly: Polynomial): [number, number, number, number] | null {
  const coefficients: [number, number, number, number] = [0, 0, 0, 0];
  for (const [key, value] of poly) {
    const { x, h } = parseKey(key);
    if (h !== 0 || value.d !== 1n || x > 3) return null;
    coefficients[x] = Number(value.n);
  }
  return coefficients.every((value) => Number.isSafeInteger(value) && Math.abs(value) <= 12) ? coefficients : null;
}

export function polynomialFromFunction(coefficients: [number, number, number, number], x0: number, mode: "substitute" | "difference" | "quotient" | "limit") {
  const h = parsePolynomial("h");
  const shifted = parsePolynomial(String(x0));
  const z = addPoly(shifted, h);
  let value: Polynomial = new Map();
  let power = constant(fraction(1n));
  for (let degree = 0; degree <= 3; degree += 1) {
    value = addPoly(value, multiplyPoly(constant(fraction(BigInt(coefficients[degree]))), power));
    if (degree < 3) power = multiplyPoly(power, z);
  }
  if (mode === "substitute") return value;
  const atPoint = coefficients.reduce((sum, coefficient, degree) => sum + coefficient * (x0 ** degree), 0);
  const difference = addPoly(value, constant(fraction(BigInt(-atPoint))));
  if (mode === "difference") return difference;
  const quotient = dividePoly(difference, parsePolynomial("h"));
  if (mode === "quotient") return quotient;
  const limit: Polynomial = new Map();
  const constantTerm = quotient.get(monomialKey(0, 0));
  if (constantTerm) limit.set(monomialKey(0, 0), constantTerm);
  return limit;
}
