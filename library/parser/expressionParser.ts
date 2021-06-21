import {
  Expression,
  Operator,
  Term,
  VarAccess,
  ParserError,
  AddOperator,
  SubtractOperator,
  MultiplyOperator,
  DivideOperator,
  PowerOperator,
} from "./expression";
import { functionMap, ExpressionFunction } from "./functions";
import { findMatchingBracket } from "./parser";

const INTEGER = "[1-9][0-9]*";
const DECIMAL = "[1-9][0-9]*\\.[0-9]*";

/**
 * Parse the inside of an expression within curly brackets: {}
 *
 * @param {string} [parseText] - the plaintext to be parsed
 * @param {number} [level] - the depth of this parse, used to stop too deeply
 * recursive calls
 * @throws {ParserError} - throws empty expression parser error if no expression
 * is passed
 * @return {[Expression, number]} the Expression object created from this text,
 * followed by the number of characters parsed
 */
export function parseExpression(
  parseText: string = "",
  level: number = 0
): [Expression, number] {
  let outExpression = new Expression();
  // TODO clean this
  outExpression.terms = [];
  let parseLength = 0;
  let innerLength = 0;
  let activeText = parseText;
  let activeTerm: Term;
  let activeOperator: Operator | undefined;
  let active = true;
  if (parseText === "") {
    throw new ParserError("Empty expression");
  }
  try {
    while (active) {
      [activeTerm, innerLength] = parseTerm(activeText, level);
      if (innerLength === 0) {
        // TODO: this might be a parser error
        active = false;
        break;
      }
      outExpression.terms = outExpression.terms.concat([activeTerm]);
      activeText = activeText.slice(innerLength);
      parseLength += innerLength;
      // Try to parse an operator
      [activeOperator, innerLength] = parseOperator(activeText);
      if (innerLength === 0) {
        // no operator detected: this expression is complete
        active = false;
        break;
      }
      outExpression.operators = outExpression.operators.concat([
        activeOperator,
      ]);
      activeText = activeText.slice(innerLength);
      parseLength += innerLength;
    }
    outExpression.level = level;
    outExpression.isNumeric = outExpression.terms.reduce(
      (acc: boolean, term: Term) => {
        return acc && term.isNumeric;
      },
      true
    );
    outExpression.generateEval();
  } catch (error) {
  } finally {
    return [outExpression, parseLength];
  }
}

export function parseTerm(parseText: string, level = 0): [Term, number] {
  // parse expression term
  let numberPattern = new RegExp(
    "^(?<value>-?((" + DECIMAL + ")|(" + INTEGER + ")))",
    "u"
  );
  let outTerm: Term = {} as Term;
  let numberMatch = parseText.match(numberPattern);
  let parseLength = 0;

  if (numberMatch !== null) {
    // simple numeric value detected
    parseLength = numberMatch[0].length;
    const value = parseFloat(numberMatch.groups["value"]);
    outTerm.evaluate = () => value;
    outTerm.isNumeric = true;
    outTerm.level = level;
    return [outTerm, parseLength];
  } else if (parseText[0] == "(") {
    // in this case parse an inner group, find the end of this group and parse
    // it as a sub-expression
    let [innerText, parseLength] = findMatchingBracket(
      parseText.slice(1),
      "(",
      ")"
    );
    // inner exression level is lower than this
    let [termExpression] = parseExpression(innerText, level + 1);
    // return the inner group and the parse Length +2 (for the parens)
    return [termExpression, parseLength + 2];
  } else if (parseText[0] == "'" || parseText[0] == '"') {
    // TODO text expressions
    [outTerm, parseLength] = parseStringTerm(parseText, parseText[0]);
    outTerm.level = level;
  } else {
    // Assume we've found a variable expression
    [outTerm, parseLength] = parseVariableFunction(parseText, level);
    outTerm.level = level;
  }
  return [outTerm, parseLength];
}

export function parseVariableFunction(
  parseText: string,
  level = 0
): [Term, number] {
  // Expect an alpha character: determine whether this is a function call or a
  // variable in the scope
  const funcMatch = /(?<func>\w+)\s+\((?<inner>.*)\)/;
  const varMatch = /(?<variable>\w*)\s+/;
  let match = parseText.match(funcMatch);
  const out = {} as Term;
  if (match != null && functionMap.get(match.groups["func"]) !== undefined) {
    const functionName = match.groups["func"];
    const innerExpression = parseExpression(match.groups["inner"], level + 1);
    const func: ExpressionFunction = functionMap.get(functionName)(
      innerExpression
    );
    out.evaluate = (scope?: any): string | number => {
      return func.evaluate(scope);
    };
    return [out, match[0].length];
  } else if (varMatch.test(parseText)) {
    // assume this is a variable
    match = parseText.match(varMatch);
    const access = new VarAccess(match.groups[0]);
    out.evaluate = (scope?: any): string | number => {
      return access.evaluate(scope);
    };
    return [out, match[0].length];
  }
  return [out, 0];
  // TODO: error here
}

export function parseStringTerm(
  parseText: string,
  quoteChar: '"' | "'"
): [Term, number] {
  let pattern: RegExp, match: any;
  let out = {} as Term;
  switch (quoteChar) {
    case '"':
      pattern = /"(\w|(?<!\\)"|')+"/u;
      match = parseText.match(pattern);
      if (match !== null) {
        out.isNumeric = false;
        out.evaluate = (scope?: any) => match.group[0];
        return [out, match[0].length];
      }
      break;
    case "'":
      pattern = /'(\w|(?<!\\)'|")+'/u;
      parseText.match(pattern);
      match = parseText.match(pattern);
      if (match !== null) {
        out.isNumeric = false;
        out.evaluate = (scope?: any) => match.group[0];
        return [out, match[0].length];
      }
      break;
  }
  out.evaluate = () => "";
  return [out, 0];
}

export function parseOperator(
  parseText: string
): [Operator | undefined, number] {
  const operatorPattern = /\s*((\*\*)|[+\-*^\/])\s*/u;
  const match = parseText.match(operatorPattern);
  if (match !== null) {
    let parseLength = match[0].length;
    switch (match[1]) {
      case "+":
        return [new AddOperator(), parseLength];
      case "-":
        return [new SubtractOperator(), parseLength];
      case "**":
        return [new PowerOperator(), parseLength];
      case "*":
        return [new MultiplyOperator(), parseLength];
      case "/":
        return [new DivideOperator(), parseLength];
    }
  }
  return [undefined, 0];
}
