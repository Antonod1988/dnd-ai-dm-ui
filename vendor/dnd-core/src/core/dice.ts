import type { DiceExpressionAst, RolledTerm, RollComparisonOperator, RollMode, RollResult } from "./types.js";

export interface Rng {
  next(): number;
}

export class SeededRng implements Rng {
  private state: number;

  constructor(seed: number | string = Date.now()) {
    this.state = typeof seed === "number" ? seed >>> 0 : hashSeed(seed);
    if (this.state === 0) {
      this.state = 0x6d2b79f5;
    }
  }

  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}

export class SystemRng implements Rng {
  next(): number {
    return Math.random();
  }
}

export type ParsedDiceExpression = {
  diceCount: number;
  sides: number;
  modifier: number;
  constant?: number;
  ast: DiceExpressionAst;
  terms: ParsedDiceTerm[];
  totalClauses: TotalClause[];
  comparison?: ParsedComparison;
};

export type ParsedDiceTerm = {
  sign: 1 | -1;
  notation: string;
  ast: DiceExpressionAst;
  kind: "const" | "die";
  value?: number;
};

type DicePool = {
  notation: string;
  count: number;
  sides: number;
  rolls: number[];
  keptIndexes: number[];
  rerolls: { original: number; replacement: number }[];
  adjustments: { original: number; adjusted: number; reason: "minimum" | "maximum" }[];
};

type TotalClause = {
  kind: "minimum" | "maximum";
  value: number;
};

type ParsedComparison = {
  operator: RollComparisonOperator;
  target: number;
};

export function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function parseDiceExpression(expression: string): ParsedDiceExpression {
  const clean = expression.toLowerCase().replace(/\s+/g, "");
  if (!clean) {
    throw new Error(`Invalid dice expression: ${expression}`);
  }

  const { body: withoutComparison, comparison } = splitComparison(clean, expression);
  const { body, totalClauses } = splitTotalClauses(withoutComparison, expression);
  const rawTerms = body.match(/[+-]?[^+-]+/g) ?? [];
  if (rawTerms.length === 0 || rawTerms.join("") !== body) {
    throw new Error(`Invalid dice expression: ${expression}`);
  }

  const terms = rawTerms.map((term) => parseSignedTerm(term, expression));
  const diceTerms = terms.filter((term) => term.kind === "die");
  const modifier = terms.reduce((sum, term) => (term.kind === "const" ? sum + term.sign * (term.value ?? 0) : sum), 0);
  const constant = diceTerms.length === 0 ? modifier : undefined;
  const singleBaseDie = diceTerms.length === 1 ? baseDie(diceTerms[0].ast) : undefined;
  const astTerms = terms.map((term) => (term.sign === 1 ? term.ast : ({ type: "signed", sign: term.sign, expr: term.ast } satisfies DiceExpressionAst)));
  const baseAst = astTerms.length === 1 ? astTerms[0] : ({ type: "sum", terms: astTerms } satisfies DiceExpressionAst);

  return {
    diceCount: singleBaseDie?.count ?? 0,
    sides: singleBaseDie?.sides ?? 0,
    modifier,
    constant,
    ast: applyTotalClausesToAst(baseAst, totalClauses),
    terms,
    totalClauses,
    comparison
  };
}

export function rollExpression(
  expression: string,
  options: { mode?: RollMode; rng?: Rng; rerollNaturalOnes?: boolean; criticalDamage?: RollResult["criticalDamage"] } = {}
): RollResult {
  const mode = options.mode ?? "normal";
  const rng = options.rng ?? new SystemRng();
  const parsed = parseDiceExpression(expression);

  if (mode !== "normal" && !isSimpleD20WithModifier(parsed)) {
    throw new Error("Advantage/disadvantage is supported only for a single d20 roll.");
  }

  const terms =
    mode === "normal"
      ? parsed.terms.map((term) => rollParsedTerm(term, rng))
      : rollD20ModeTerms(parsed, rng, mode);
  const resolvedTerms = options.rerollNaturalOnes ? rerollNaturalOnesForD20Terms(terms, rng, mode) : terms;
  const rolls = resolvedTerms.flatMap((term) => (term.type === "die" ? term.rolls : []));
  const keptRolls = resolvedTerms.flatMap((term) => (term.type === "die" ? term.keptRolls : []));
  const unadjustedTotal = resolvedTerms.reduce((sum, term) => sum + term.total, 0);
  const totalResult = applyTotalClausesToTotal(unadjustedTotal, parsed.totalClauses);
  const natural = naturalD20(resolvedTerms, parsed, mode);
  const comparison = parsed.comparison ? evaluateComparison(totalResult.total, parsed.comparison) : undefined;

  return {
    expression,
    rolls,
    keptRolls,
    modifier: parsed.modifier,
    unadjustedTotal: totalResult.adjustments.length ? unadjustedTotal : undefined,
    total: totalResult.total,
    totalAdjustments: totalResult.adjustments.length ? totalResult.adjustments : undefined,
    comparison,
    natural,
    critical: natural === 20,
    criticalDamage: options.criticalDamage,
    mode,
    ast: parsed.ast,
    terms: resolvedTerms
  };
}

export function rollDie(sides: number, rng: Rng = new SystemRng()): number {
  if (!Number.isInteger(sides) || sides < 2 || sides > 1000) {
    throw new Error(`Invalid die size: ${sides}`);
  }
  return Math.floor(rng.next() * sides) + 1;
}

export function rollMany(count: number, sides: number, rng: Rng): number[] {
  validateDice(count, sides, `${count}d${sides}`);
  return Array.from({ length: count }, () => rollDie(sides, rng));
}

export function doubleDiceExpression(expression: string): string {
  const parsed = parseDiceExpression(expression);
  if (!parsed.terms.some((term) => term.kind === "die")) {
    return expression;
  }
  return `${formatTerms(
    parsed.terms.map((term) =>
      term.kind === "die" ? { sign: term.sign, notation: scaleDiceNotation(term.notation, 2) } : term
    )
  )}${formatExpressionSuffix(parsed)}`;
}

export function addModifierToExpression(expression: string, extraModifier: number): string {
  const parsed = parseDiceExpression(expression);
  const diceTerms = parsed.terms.filter((term) => term.kind === "die");
  const modifier = parsed.modifier + extraModifier;
  if (diceTerms.length === 0) {
    return `${modifier}${formatExpressionSuffix(parsed)}`;
  }
  return formatTerms([
    ...diceTerms.map((term) => ({ sign: term.sign, notation: term.notation })),
    ...(modifier === 0 ? [] : [{ sign: (modifier >= 0 ? 1 : -1) as 1 | -1, notation: String(Math.abs(modifier)) }])
  ]) + formatExpressionSuffix(parsed);
}

function splitComparison(clean: string, originalExpression: string): { body: string; comparison?: ParsedComparison } {
  const match = clean.match(/(>=|<=|==|!=|>|<)(-?\d+)$/u);
  if (!match) {
    return { body: clean };
  }
  const body = clean.slice(0, -match[0].length);
  if (!body) {
    throw new Error(`Invalid dice expression: ${originalExpression}`);
  }
  return {
    body,
    comparison: {
      operator: match[1] as RollComparisonOperator,
      target: Number.parseInt(match[2], 10)
    }
  };
}

function splitTotalClauses(clean: string, originalExpression: string): { body: string; totalClauses: TotalClause[] } {
  let body = clean;
  const reversedClauses: TotalClause[] = [];
  while (body.length > 0) {
    const match = body.match(/(totalmin|totalmax)(\d+)$/u);
    if (!match) {
      break;
    }
    const value = Number.parseInt(match[2], 10);
    if (!Number.isInteger(value) || value < 0 || value > 1_000_000) {
      throw new Error(`Invalid ${match[1]} value in expression: ${originalExpression}`);
    }
    reversedClauses.push({ kind: match[1] === "totalmin" ? "minimum" : "maximum", value });
    body = body.slice(0, -match[0].length);
  }
  if (!body) {
    throw new Error(`Invalid dice expression: ${originalExpression}`);
  }
  return { body, totalClauses: reversedClauses.reverse() };
}

function applyTotalClausesToAst(ast: DiceExpressionAst, clauses: TotalClause[]): DiceExpressionAst {
  return clauses.reduce<DiceExpressionAst>(
    (expr, clause) =>
      clause.kind === "minimum"
        ? ({ type: "totalMinimum", expr, value: clause.value } satisfies DiceExpressionAst)
        : ({ type: "totalMaximum", expr, value: clause.value } satisfies DiceExpressionAst),
    ast
  );
}

function applyTotalClausesToTotal(
  initialTotal: number,
  clauses: TotalClause[]
): { total: number; adjustments: NonNullable<RollResult["totalAdjustments"]> } {
  let total = initialTotal;
  const adjustments: NonNullable<RollResult["totalAdjustments"]> = [];
  for (const clause of clauses) {
    const adjusted = clause.kind === "minimum" ? Math.max(total, clause.value) : Math.min(total, clause.value);
    if (adjusted !== total) {
      adjustments.push({ original: total, adjusted, reason: clause.kind });
      total = adjusted;
    }
  }
  return { total, adjustments };
}

function evaluateComparison(total: number, comparison: ParsedComparison): NonNullable<RollResult["comparison"]> {
  const { operator, target } = comparison;
  const success =
    operator === ">="
      ? total >= target
      : operator === ">"
        ? total > target
        : operator === "<="
          ? total <= target
          : operator === "<"
            ? total < target
            : operator === "=="
              ? total === target
              : total !== target;
  return { operator, target, success, difference: total - target };
}

function parseSignedTerm(rawTerm: string, originalExpression: string): ParsedDiceTerm {
  const sign = rawTerm.startsWith("-") ? -1 : 1;
  const body = rawTerm.replace(/^[+-]/u, "");
  if (!body) {
    throw new Error(`Invalid dice expression: ${originalExpression}`);
  }

  const constant = body.match(/^\d+$/u);
  if (constant) {
    return { sign, notation: body, ast: { type: "const", value: Number.parseInt(body, 10) }, kind: "const", value: Number.parseInt(body, 10) };
  }

  const dice = body.match(/^(\d*)d(\d+)(.*)$/u);
  if (!dice) {
    throw new Error(`Invalid dice expression: ${originalExpression}`);
  }

  const count = dice[1] === "" ? 1 : Number.parseInt(dice[1], 10);
  const sides = Number.parseInt(dice[2], 10);
  validateDice(count, sides, originalExpression);
  return { sign, notation: body, ast: parseDiceSuffixes({ type: "die", count, sides }, dice[3], count, sides, originalExpression), kind: "die" };
}

function parseDiceSuffixes(
  initialAst: DiceExpressionAst,
  suffix: string,
  count: number,
  sides: number,
  originalExpression: string
): DiceExpressionAst {
  let rest = suffix;
  let ast = initialAst;
  while (rest.length > 0) {
    const keepDrop = rest.match(/^(kh|kl|dh|dl)(\d+)/u);
    if (keepDrop) {
      const amount = Number.parseInt(keepDrop[2], 10);
      if (!Number.isInteger(amount) || amount < 1 || amount > count) {
        throw new Error(`Invalid keep/drop count in expression: ${originalExpression}`);
      }
      const type =
        keepDrop[1] === "kh"
          ? "keepHighest"
          : keepDrop[1] === "kl"
            ? "keepLowest"
            : keepDrop[1] === "dh"
              ? "dropHighest"
              : "dropLowest";
      ast =
        type === "keepHighest" || type === "keepLowest"
          ? ({ type, expr: ast, keep: amount } satisfies DiceExpressionAst)
          : ({ type, expr: ast, drop: amount } satisfies DiceExpressionAst);
      rest = rest.slice(keepDrop[0].length);
      continue;
    }

    const reroll = rest.match(/^r(o?)(\d+(?:,\d+)*)/u);
    if (reroll) {
      const values = reroll[2].split(",").map((item) => Number.parseInt(item, 10));
      if (values.some((value) => !Number.isInteger(value) || value < 1 || value > sides)) {
        throw new Error(`Invalid reroll values in expression: ${originalExpression}`);
      }
      ast = { type: "reroll", expr: ast, values: [...new Set(values)], once: reroll[1] === "o" };
      rest = rest.slice(reroll[0].length);
      continue;
    }

    const minMax = rest.match(/^(min|max)(\d+)/u);
    if (minMax) {
      const value = Number.parseInt(minMax[2], 10);
      if (!Number.isInteger(value) || value < 1 || value > sides) {
        throw new Error(`Invalid ${minMax[1]} value in expression: ${originalExpression}`);
      }
      ast =
        minMax[1] === "min"
          ? ({ type: "minimum", expr: ast, value } satisfies DiceExpressionAst)
          : ({ type: "maximum", expr: ast, value } satisfies DiceExpressionAst);
      rest = rest.slice(minMax[0].length);
      continue;
    }

    throw new Error(`Invalid dice expression: ${originalExpression}`);
  }
  return ast;
}

function rollParsedTerm(term: ParsedDiceTerm, rng: Rng): RolledTerm {
  if (term.kind === "const") {
    const value = term.value ?? 0;
    return {
      type: "const",
      notation: term.notation,
      sign: term.sign,
      value,
      total: term.sign * value
    };
  }

  const pool = rollDicePool(term.ast, rng, term.notation);
  const keptRolls = pool.keptIndexes.map((index) => pool.rolls[index]);
  const droppedRolls = pool.rolls.filter((_, index) => !pool.keptIndexes.includes(index));
  return {
    type: "die",
    notation: term.notation,
    sign: term.sign,
    count: pool.count,
    sides: pool.sides,
    rolls: pool.rolls,
    keptRolls,
    droppedRolls,
    rerolls: pool.rerolls,
    adjustments: pool.adjustments,
    total: term.sign * keptRolls.reduce((sum, roll) => sum + roll, 0)
  };
}

function rollDicePool(ast: DiceExpressionAst, rng: Rng, notation: string): DicePool {
  switch (ast.type) {
    case "die": {
      const rolls = rollMany(ast.count, ast.sides, rng);
      return {
        notation,
        count: ast.count,
        sides: ast.sides,
        rolls,
        keptIndexes: rolls.map((_, index) => index),
        rerolls: [],
        adjustments: []
      };
    }
    case "reroll": {
      const pool = rollDicePool(ast.expr, rng, notation);
      const rerolls: { original: number; replacement: number }[] = [];
      const rolls = pool.rolls.map((roll) => {
        if (!ast.values.includes(roll)) {
          return roll;
        }
        let replacement = rollDie(pool.sides, rng);
        if (!ast.once) {
          let guard = 0;
          while (ast.values.includes(replacement) && guard < 100) {
            replacement = rollDie(pool.sides, rng);
            guard += 1;
          }
        }
        rerolls.push({ original: roll, replacement });
        return replacement;
      });
      return { ...pool, rolls, rerolls: [...pool.rerolls, ...rerolls] };
    }
    case "minimum":
      return applyRollFloorOrCeiling(rollDicePool(ast.expr, rng, notation), ast.value, "minimum");
    case "maximum":
      return applyRollFloorOrCeiling(rollDicePool(ast.expr, rng, notation), ast.value, "maximum");
    case "keepHighest":
      return keepOrDrop(rollDicePool(ast.expr, rng, notation), ast.keep, "keep", "highest");
    case "keepLowest":
      return keepOrDrop(rollDicePool(ast.expr, rng, notation), ast.keep, "keep", "lowest");
    case "dropHighest":
      return keepOrDrop(rollDicePool(ast.expr, rng, notation), ast.drop, "drop", "highest");
    case "dropLowest":
      return keepOrDrop(rollDicePool(ast.expr, rng, notation), ast.drop, "drop", "lowest");
    case "const":
    case "sum":
    case "signed":
    case "totalMinimum":
    case "totalMaximum":
      throw new Error("Internal dice parser error: non-die AST in dice pool.");
  }
}

function keepOrDrop(pool: DicePool, amount: number, operation: "keep" | "drop", side: "highest" | "lowest"): DicePool {
  const sortedIndexes = pool.rolls
    .map((roll, index) => ({ roll, index }))
    .sort((a, b) => (side === "highest" ? b.roll - a.roll || a.index - b.index : a.roll - b.roll || a.index - b.index))
    .slice(0, amount)
    .map((item) => item.index);
  const keptIndexes =
    operation === "keep"
      ? sortedIndexes.sort((a, b) => a - b)
      : pool.rolls.map((_, index) => index).filter((index) => !sortedIndexes.includes(index));
  return { ...pool, keptIndexes };
}

function applyRollFloorOrCeiling(pool: DicePool, value: number, reason: "minimum" | "maximum"): DicePool {
  const adjustments: DicePool["adjustments"] = [];
  const rolls = pool.rolls.map((roll) => {
    const adjusted = reason === "minimum" ? Math.max(roll, value) : Math.min(roll, value);
    if (adjusted !== roll) {
      adjustments.push({ original: roll, adjusted, reason });
    }
    return adjusted;
  });
  return { ...pool, rolls, adjustments: [...pool.adjustments, ...adjustments] };
}

function rollD20ModeTerms(parsed: ParsedDiceExpression, rng: Rng, mode: RollMode): RolledTerm[] {
  const diceTerm = parsed.terms.find((term) => term.kind === "die");
  if (!diceTerm) {
    return parsed.terms.map((term) => rollParsedTerm(term, rng));
  }
  const rolls = [rollDie(20, rng), rollDie(20, rng)];
  const kept = mode === "advantage" ? Math.max(...rolls) : Math.min(...rolls);
  return parsed.terms.map((term) => {
    if (term !== diceTerm) {
      return rollParsedTerm(term, rng);
    }
    return {
      type: "die",
      notation: term.notation,
      sign: term.sign,
      count: 1,
      sides: 20,
      rolls,
      keptRolls: [kept],
      droppedRolls: rolls.filter((roll) => roll !== kept).slice(0, 1),
      rerolls: [],
      total: kept
    };
  });
}

function rerollNaturalOnesForD20Terms(terms: RolledTerm[], rng: Rng, mode: RollMode): RolledTerm[] {
  return terms.map((term) => {
    if (term.type !== "die" || term.sides !== 20 || !term.rolls.includes(1)) {
      return term;
    }

    const rerolls: { original: number; replacement: number }[] = [];
    const rolls = term.rolls.map((roll) => {
      if (roll !== 1) {
        return roll;
      }
      const replacement = rollDie(20, rng);
      rerolls.push({ original: roll, replacement });
      return replacement;
    });
    const keptIndexes = keptD20Indexes(rolls, mode);
    const keptRolls = keptIndexes.map((index) => rolls[index]);
    const droppedRolls = rolls.filter((_, index) => !keptIndexes.includes(index));
    const sign = term.sign ?? 1;

    return {
      ...term,
      rolls,
      keptRolls,
      droppedRolls,
      rerolls: [...term.rerolls, ...rerolls],
      total: sign * keptRolls.reduce((sum, roll) => sum + roll, 0)
    };
  });
}

function keptD20Indexes(rolls: number[], mode: RollMode): number[] {
  if (mode === "advantage") {
    return [rolls.reduce((bestIndex, roll, index) => (roll > rolls[bestIndex] ? index : bestIndex), 0)];
  }
  if (mode === "disadvantage") {
    return [rolls.reduce((bestIndex, roll, index) => (roll < rolls[bestIndex] ? index : bestIndex), 0)];
  }
  return rolls.map((_, index) => index);
}

function naturalD20(terms: RolledTerm[], parsed: ParsedDiceExpression, mode: RollMode): number | undefined {
  const diceTerms = terms.filter((term): term is Extract<RolledTerm, { type: "die" }> => term.type === "die");
  if (diceTerms.length !== 1 || diceTerms[0].sides !== 20 || diceTerms[0].keptRolls.length !== 1) {
    return undefined;
  }
  if (mode !== "normal") {
    return diceTerms[0].keptRolls[0];
  }
  return isSingleD20Expression(parsed) ? diceTerms[0].keptRolls[0] : undefined;
}

function isSimpleD20WithModifier(parsed: ParsedDiceExpression): boolean {
  return parsed.terms.every((term) => term.kind === "const" || (term.kind === "die" && isSingleD20Ast(term.ast) && term.sign === 1));
}

function isSingleD20Expression(parsed: ParsedDiceExpression): boolean {
  return parsed.terms.every((term) => term.kind === "const" || (term.kind === "die" && baseDie(term.ast)?.sides === 20 && term.sign === 1));
}

function isSingleD20Ast(ast: DiceExpressionAst): boolean {
  return ast.type === "die" && ast.count === 1 && ast.sides === 20;
}

function baseDie(ast: DiceExpressionAst): { count: number; sides: number } | undefined {
  switch (ast.type) {
    case "die":
      return { count: ast.count, sides: ast.sides };
    case "keepHighest":
    case "keepLowest":
    case "dropHighest":
    case "dropLowest":
    case "reroll":
    case "minimum":
    case "maximum":
    case "totalMinimum":
    case "totalMaximum":
    case "signed":
      return baseDie(ast.expr);
    case "const":
    case "sum":
      return undefined;
  }
}

function scaleDiceNotation(notation: string, factor: number): string {
  return notation.replace(/^(\d*)d(\d+)/u, (_, countText: string, sides: string) => {
    const count = countText === "" ? 1 : Number.parseInt(countText, 10);
    return `${count * factor}d${sides}`;
  });
}

function formatTerms(terms: { sign: 1 | -1; notation: string }[]): string {
  return terms
    .map((term, index) => {
      if (index === 0) {
        return term.sign === -1 ? `-${term.notation}` : term.notation;
      }
      return `${term.sign === -1 ? "-" : "+"}${term.notation}`;
    })
    .join("");
}

function formatExpressionSuffix(parsed: Pick<ParsedDiceExpression, "totalClauses" | "comparison">): string {
  const totalText = parsed.totalClauses
    .map((clause) => `${clause.kind === "minimum" ? "totalmin" : "totalmax"}${clause.value}`)
    .join("");
  const comparisonText = parsed.comparison ? `${parsed.comparison.operator}${parsed.comparison.target}` : "";
  return `${totalText}${comparisonText}`;
}

function validateDice(count: number, sides: number, expression: string): void {
  if (!Number.isInteger(count) || count < 1 || count > 100) {
    throw new Error(`Invalid dice count in expression: ${expression}`);
  }
  if (!Number.isInteger(sides) || sides < 2 || sides > 1000) {
    throw new Error(`Invalid die size in expression: ${expression}`);
  }
}
