/**
 * Mathematical Theory Parser for MathGraph
 * Supports a custom syntax for defining constraints, sets, and logical formulas
 */

export type MathOperator = 'AND' | 'OR' | 'NOT' | 'IMPLIES' | 'IFF' | 'FORALL' | 'EXISTS';

export interface MathExpression {
  type: 'operator' | 'quantifier' | 'variable' | 'literal' | 'set' | 'predicate';
  value: string;
  children?: MathExpression[];
  bound?: { variable: string; set: string }; // for quantifiers
}

export interface ParsedFormula {
  expressions: MathExpression[];
  errors: string[];
  variables: Set<string>;
  sets: Set<string>;
}

export interface Point {
  x: number;
  y: number;
}

export type UsageRule =
  | 'standalone'              // Can be placed anywhere like entity/fact type
  | 'wraps-single-object'     // Wraps around any single object (like objectification)
  | 'wraps-single-entity'     // Wraps around a single entity only (like power type)
  | 'wraps-multiple-objects'  // Wraps around multiple objects
  | 'wraps-multiple-entities' // Wraps around multiple entities only
  | 'on-edge';                // Placed on an edge (like constraints)

export interface CustomSet {
  name: string;
  symbol: string;
  shape: 'circle' | 'square' | 'diamond' | 'rectangle' | 'custom';
  usageRule: UsageRule;
  description?: string;
  customShape?: Point[]; // Custom shape coordinates when shape === 'custom'
}

export interface CustomConstraint {
  name: string;
  formula: string;
  parsed?: ParsedFormula;
  description?: string;
}

// Operator aliases for user-friendly input
const OPERATOR_ALIASES: Record<string, MathOperator> = {
  'AND': 'AND',
  '&&': 'AND',
  '&': 'AND',
  '/\\': 'AND',
  '∧': 'AND',
  'OR': 'OR',
  '||': 'OR',
  '|': 'OR',
  '\\/': 'OR',
  '∨': 'OR',
  'NOT': 'NOT',
  '!': 'NOT',
  '¬': 'NOT',
  '~': 'NOT',
  'IMPLIES': 'IMPLIES',
  '=>': 'IMPLIES',
  '→': 'IMPLIES',
  'IFF': 'IFF',
  '<=>': 'IFF',
  '↔': 'IFF',
  'FORALL': 'FORALL',
  '∀': 'FORALL',
  'EXISTS': 'EXISTS',
  '∃': 'EXISTS',
};

/**
 * Tokenize the input formula into meaningful tokens
 */
function tokenize(formula: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inBracket = false;
  let inBrace = false;

  for (let i = 0; i < formula.length; i++) {
    const char = formula[i];
    const next = formula[i + 1];

    // Handle comments
    if (char === '/' && next === '/') {
      // Skip until end of line
      while (i < formula.length && formula[i] !== '\n') i++;
      continue;
    }
    if (char === '#') {
      // Skip until end of line
      while (i < formula.length && formula[i] !== '\n') i++;
      continue;
    }

    // Handle whitespace
    if (/\s/.test(char) && !inBracket && !inBrace) {
      if (current) {
        tokens.push(current);
        current = '';
      }
      continue;
    }

    // Handle special characters
    if (char === '[') {
      if (current) tokens.push(current);
      current = '[';
      inBracket = true;
      continue;
    }
    if (char === ']') {
      current += char;
      tokens.push(current);
      current = '';
      inBracket = false;
      continue;
    }
    if (char === '{') {
      current += char;
      inBrace = true;
      continue;
    }
    if (char === '}') {
      current += char;
      inBrace = false;
      continue;
    }

    // Handle operators
    if (!inBracket && !inBrace) {
      const twoChar = char + next;
      if (twoChar === '&&' || twoChar === '||' || twoChar === '=>' || twoChar === '/\\' || twoChar === '\\/' || twoChar === '<=>' || twoChar === '//') {
        if (current) tokens.push(current);
        tokens.push(twoChar);
        current = '';
        i++; // Skip next char
        continue;
      }
      if (char === '&' || char === '|' || char === '!' || char === '~' || char === ';' || char === '(' || char === ')') {
        if (current) tokens.push(current);
        tokens.push(char);
        current = '';
        continue;
      }
    }

    current += char;
  }

  if (current) tokens.push(current);

  return tokens.filter(t => t.trim().length > 0);
}

/**
 * Parse a quantifier expression: forall_{x in S}[condition]
 */
function parseQuantifier(tokens: string[], index: number): { expr: MathExpression; nextIndex: number } | null {
  const quantifierToken = tokens[index];
  const operator = OPERATOR_ALIASES[quantifierToken] || OPERATOR_ALIASES[quantifierToken.toUpperCase()];

  if (operator !== 'FORALL' && operator !== 'EXISTS') {
    return null;
  }

  // Check for _{var in Set} binding
  let bound: { variable: string; set: string } | undefined;
  let nextIdx = index + 1;

  if (tokens[nextIdx]?.startsWith('_{')) {
    const bindingMatch = tokens[nextIdx].match(/^_\{(\w+)\s+in\s+(\w+)\}$/);
    if (bindingMatch) {
      bound = { variable: bindingMatch[1], set: bindingMatch[2] };
      nextIdx++;
    }
  }

  // Parse the condition in brackets
  if (tokens[nextIdx]?.startsWith('[')) {
    let bracketContent = tokens[nextIdx].slice(1, -1); // Remove [ and ]

    const expr: MathExpression = {
      type: 'quantifier',
      value: operator,
      bound,
      children: [parseSubExpression(bracketContent)]
    };

    return { expr, nextIndex: nextIdx + 1 };
  }

  return null;
}

/**
 * Parse a sub-expression (simplified recursive descent)
 */
function parseSubExpression(expr: string): MathExpression {
  const tokens = tokenize(expr);

  // Simple literal or variable
  if (tokens.length === 1) {
    return {
      type: /^[A-Z]$/.test(tokens[0]) ? 'set' : 'variable',
      value: tokens[0]
    };
  }

  // Find main operator (lowest precedence)
  // Priority: OR < AND < NOT
  for (const opAlias of ['OR', '||', '\\/', '∨']) {
    const idx = tokens.findIndex(t => t === opAlias || t.toUpperCase() === opAlias);
    if (idx !== -1) {
      return {
        type: 'operator',
        value: 'OR',
        children: [
          parseSubExpression(tokens.slice(0, idx).join(' ')),
          parseSubExpression(tokens.slice(idx + 1).join(' '))
        ]
      };
    }
  }

  for (const opAlias of ['AND', '&&', '/\\', '∧']) {
    const idx = tokens.findIndex(t => t === opAlias || t.toUpperCase() === opAlias);
    if (idx !== -1) {
      return {
        type: 'operator',
        value: 'AND',
        children: [
          parseSubExpression(tokens.slice(0, idx).join(' ')),
          parseSubExpression(tokens.slice(idx + 1).join(' '))
        ]
      };
    }
  }

  // Default to literal
  return {
    type: 'literal',
    value: expr
  };
}

/**
 * Parse a mathematical formula
 */
export function parseFormula(formula: string): ParsedFormula {
  const result: ParsedFormula = {
    expressions: [],
    errors: [],
    variables: new Set(),
    sets: new Set()
  };

  try {
    // Split by semicolons for multiple formulas
    const formulas = formula.split(';').map(f => f.trim()).filter(f => f.length > 0);

    for (const formulaLine of formulas) {
      const tokens = tokenize(formulaLine);
      let i = 0;

      while (i < tokens.length) {
        // Try to parse quantifier
        const quantResult = parseQuantifier(tokens, i);
        if (quantResult) {
          result.expressions.push(quantResult.expr);
          if (quantResult.expr.bound) {
            result.variables.add(quantResult.expr.bound.variable);
            result.sets.add(quantResult.expr.bound.set);
          }
          i = quantResult.nextIndex;
          continue;
        }

        // Parse regular expression
        const expr = parseSubExpression(tokens.slice(i).join(' '));
        result.expressions.push(expr);
        break;
      }
    }

    // Collect variables and sets
    function collectVarsAndSets(expr: MathExpression) {
      if (expr.type === 'variable') result.variables.add(expr.value);
      if (expr.type === 'set') result.sets.add(expr.value);
      expr.children?.forEach(collectVarsAndSets);
    }
    result.expressions.forEach(collectVarsAndSets);

  } catch (error) {
    result.errors.push((error as Error).message);
  }

  return result;
}

/**
 * Format a formula for display (convert to mathematical symbols)
 */
export function formatFormula(formula: string): string {
  return formula
    .replace(/FORALL/g, '∀')
    .replace(/EXISTS/g, '∃')
    .replace(/AND/g, '∧')
    .replace(/OR/g, '∨')
    .replace(/NOT/g, '¬')
    .replace(/IMPLIES/g, '→')
    .replace(/IFF/g, '↔')
    .replace(/&&/g, '∧')
    .replace(/\|\|/g, '∨')
    .replace(/=>/g, '→')
    .replace(/<=>/g, '↔')
    .replace(/!/g, '¬');
}

/**
 * Validate a formula for syntax errors
 */
export function validateFormula(formula: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check balanced brackets
  let bracketDepth = 0;
  let braceDepth = 0;
  let parenDepth = 0;

  for (const char of formula) {
    if (char === '[') bracketDepth++;
    if (char === ']') bracketDepth--;
    if (char === '{') braceDepth++;
    if (char === '}') braceDepth--;
    if (char === '(') parenDepth++;
    if (char === ')') parenDepth--;

    if (bracketDepth < 0) errors.push('Unmatched closing bracket ]');
    if (braceDepth < 0) errors.push('Unmatched closing brace }');
    if (parenDepth < 0) errors.push('Unmatched closing parenthesis )');
  }

  if (bracketDepth > 0) errors.push('Unclosed bracket [');
  if (braceDepth > 0) errors.push('Unclosed brace {');
  if (parenDepth > 0) errors.push('Unclosed parenthesis (');

  // Check quantifier syntax
  const quantifierRegex = /(FORALL|EXISTS|∀|∃)(_\{[\w\s]+in[\w\s]+\})?\[/g;
  const quantifiers = formula.match(quantifierRegex);
  if (quantifiers) {
    for (const q of quantifiers) {
      if (q.includes('_{') && !q.match(/_\{\w+\s+in\s+\w+\}\[/)) {
        errors.push(`Invalid quantifier binding syntax: ${q}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
