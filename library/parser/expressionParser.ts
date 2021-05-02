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
import { EvalText } from "./models";
import { findMatchingBracket } from "./parser";

const INTEGER = "[1-9][0-9]*";
const DECIMAL = "[1-9][0-9]*\\.[0-9]*";

// parse the inside of an expression within curly brackets: {}
export function parseExpression(
  parseText = "",
  level = 0
): [Expression, number] {
  let outExpression = new Expression();
  let parseLength = 0;
  let innerLength = 0;
  let activeText = parseText;
  if (parseText === "") {
    throw new ParserError("Empty expression");
  }
  try {
    [outExpression.leftTerm, innerLength] = parseTerm(parseText, level);
    // move the active text forward
    activeText = parseText.slice(innerLength);
    parseLength += innerLength;
    [outExpression.operator, innerLength] = parseOperator(activeText);
    activeText = activeText.slice(innerLength);
    parseLength += innerLength;
    if (innerLength == 0) {
      // no operator, this expression only has a single term
      outExpression.isNumeric = outExpression.leftTerm.isNumeric;
      outExpression.generateEval();
      return [outExpression, parseLength];
    }
    [outExpression.rightTerm, innerLength] = parseTerm(activeText, level);
    activeText = activeText.slice(innerLength);
    parseLength += innerLength;
    outExpression.level = level;
    outExpression.isNumeric =
      outExpression.leftTerm.isNumeric && outExpression.rightTerm.isNumeric;
    outExpression.generateEval();
  } catch (error) {
    console.log(`error ${error}`);
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
    // simple numeric value
    parseLength = numberMatch[0].length;
    const value = parseFloat(numberMatch.groups["value"]);
    outTerm.evaluate = () => value;
    outTerm.isNumeric = true;
    outTerm.level = level;
    return [outTerm, parseLength];
  } else if (parseText[0] == "(") {
    let [innerText, parseLength] = findMatchingBracket(
      parseText.slice(1),
      "(",
      ")"
    );
    let [termExpression] = parseExpression(innerText, level + 1);
    return [termExpression, parseLength + 2];
  } else if (parseText[0] == "'" || parseText[0] == '"') {
    // TODO text expressions
    [outTerm, parseLength] = parseStringTerm(parseText, parseText[0]);
    outTerm.level = level;
  } else {
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
