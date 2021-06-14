import { parseExpression, parseTerm } from "./expressionParser";
import {
  Expression,
  AddOperator,
  SubtractOperator,
  MultiplyOperator,
  DivideOperator,
  Term,
} from "./expression";

describe("parses expressions correctly", () => {
  const testCases = [
    {
      testCaseText: "parses addition correctly",
      parseText: "1+2",
      expected: {
        terms: [
          { evaluate: expect.any(Function), isNumeric: true, level: 0 },
          { evaluate: expect.any(Function), isNumeric: true, level: 0 },
        ],
        operators: [new AddOperator()],
        isNumeric: true,
        level: 0,
      },
      parseLength: 3,
      eval: 3,
    },
    {
      testCaseText: "parses subtraction correctly",
      parseText: "1-32",
      expected: {
        terms: [
          { evaluate: expect.any(Function), isNumeric: true },
          { evaluate: expect.any(Function), isNumeric: true },
        ],
        operators: [new SubtractOperator()],
        isNumeric: true,
      },
      parseLength: 4,
      eval: -31,
    },
    {
      testCaseText: "parses multiplication correctly",
      parseText: "3*5",
      expected: {
        terms: [
          { evaluate: expect.any(Function), isNumeric: true },
          { evaluate: expect.any(Function), isNumeric: true },
        ],
        operators: [new MultiplyOperator()],
        isNumeric: true,
      },
      parseLength: 3,
      eval: 15,
    },
    {
      testCaseText: "parses groups correctly",
      parseText: "3*(1+3)",
      expected: {
        terms: [
          { evaluate: expect.any(Function), isNumeric: true },
          { evaluate: expect.any(Function), isNumeric: true },
        ],
        operators: [new MultiplyOperator()],
        isNumeric: true,
      },
      parseLength: 7,
      eval: 12,
    },
    {
      testCaseText: "parses sparse expressions correctly",
      parseText: "3 + 4",
      expected: {
        terms: [
          { evaluate: expect.any(Function), isNumeric: true },
          { evaluate: expect.any(Function), isNumeric: true },
        ],
        operators: [new AddOperator()],
      },
      parseLength: 5,
      eval: 7,
    },
    {
      testCaseText: "parses sparse expressions with multiple operators",
      parseText: "3 + 4 + 3",
      expected: {
        terms: [
          { evaluate: expect.any(Function), isNumeric: true },
          { evaluate: expect.any(Function), isNumeric: true },
          { evaluate: expect.any(Function), isNumeric: true },
        ],
        operators: [new AddOperator(), new AddOperator()],
      },
      parseLength: 9,
      eval: 10,
    },
    {
      testCaseText:
        "parses expressions with multiple operators and proper order",
      parseText: "3 + 4 * 3",
      expected: {
        terms: [
          { evaluate: expect.any(Function), isNumeric: true },
          { evaluate: expect.any(Function), isNumeric: true },
          { evaluate: expect.any(Function), isNumeric: true },
        ],
        operators: [new AddOperator(), new MultiplyOperator()],
      },
      parseLength: 9,
      eval: 15,
    },
    {
      testCaseText: "parses expressions with multiple sub-expressions",
      parseText: "(1+3)*(5-3) + 11",
      expected: {
        terms: [
          { evaluate: expect.any(Function), isNumeric: true },
          { evaluate: expect.any(Function), isNumeric: true },
          { evaluate: expect.any(Function), isNumeric: true },
        ],
        operators: [new MultiplyOperator(), new AddOperator()],
      },
      parseLength: 16,
      eval: 19,
    },
    {
      testCaseText: "parses division correctly",
      parseText: "10/2",
      expected: {
        terms: [
          { evaluate: expect.any(Function), isNumeric: true },
          { evaluate: expect.any(Function), isNumeric: true },
        ],
        operators: [new DivideOperator()],
        isNumeric: true,
      },
      parseLength: 4,
      eval: 5,
    },
    {
      testCaseText: "parses division with remainders correctly",
      parseText: "4/3",
      expected: {
        terms: [
          { evaluate: expect.any(Function), isNumeric: true },
          { evaluate: expect.any(Function), isNumeric: true },
        ],
        operators: [new DivideOperator()],
        isNumeric: true,
      },
      parseLength: 3,
      eval: 4.0 / 3.0,
    },
  ];
  testCases.forEach((test) => {
    it(`${test.testCaseText}: ${test.parseText} `, () => {
      const result = parseExpression(test.parseText);
      expect(result[0]).toMatchObject(test.expected);
      expect(result[1]).toStrictEqual(test.parseLength);
      expect(result[0].evaluate()).toStrictEqual(test.eval);
    });
  });
});

describe("parses number Terms correctly", () => {
  const testCases = [
    {
      testCaseText: "parses single digits correctly",
      parseText: "1",
      expected: {
        evaluate: expect.any(Function),
        isNumeric: true,
      },
      parseLength: 1,
      evaluate: 1,
    },
    {
      testCaseText: "parses double digits correctly",
      parseText: "42",
      expected: {
        evaluate: expect.any(Function),
        isNumeric: true,
      },
      parseLength: 2,
      evaluate: 42,
    },
    {
      testCaseText: "parses negative numbers correctly",
      parseText: "-54",
      expected: {
        evaluate: expect.any(Function),
        isNumeric: true,
      },
      parseLength: 3,
      evaluate: -54,
    },
    {
      testCaseText: "parses floating point numbers correctly",
      parseText: "1.32",
      expected: {
        evaluate: expect.any(Function),
        isNumeric: true,
      },
      parseLength: 4,
      evaluate: 1.32,
    },
  ];
  testCases.forEach((test) => {
    it(test.testCaseText, () => {
      const result = parseTerm(test.parseText);
      expect(result[0]).toMatchObject(test.expected);
      expect(result[1]).toStrictEqual(test.parseLength);
      expect(result[0].evaluate()).toEqual(test.evaluate);
    });
  });
});
