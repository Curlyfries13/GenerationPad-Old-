import { parseExpression, parseTerm } from "./expressionParser";
import { Expression, AddOperator, SubtractOperator, Term } from "./expression";

describe("parses expressions correctly", () => {
  const testCases = [
    {
      testCaseText: "parses addition correctly",
      parseText: "1+2",
      expected: {
        leftTerm: { evaluate: expect.any(Function), isNumeric: true } as Term,
        operator: new AddOperator(),
        rightTerm: { evaluate: expect.any(Function), isNumeric: true } as Term,
        isNumeric: true,
      },
      parseLength: 3,
      eval: 3,
    },
    {
      testCaseText: "parses subtraction correctly",
      parseText: "1-32",
      expected: {
        leftTerm: { evaluate: expect.any(Function), isNumeric: true } as Term,
        operator: new SubtractOperator(),
        rightTerm: { evaluate: expect.any(Function), isNumeric: true } as Term,
        isNumeric: true,
      },
      parseLength: 4,
      eval: -31,
    },
    {
      testCaseText: "parses multiplication correctly",
      parseText: "3*5",
      expected: {
        leftTerm: { evaluate: expect.any(Function), isNumeric: true } as Term,
        operator: new SubtractOperator(),
        rightTerm: { evaluate: expect.any(Function), isNumeric: true } as Term,
        isNumeric: true,
      },
      parseLength: 3,
      eval: 15,
    },
    {
      testCaseText: "parses groups correctly",
      parseText: "3*(1+3)",
      expected: {
        leftTerm: { evaluate: expect.any(Function), isNumeric: true } as Term,
        operator: new SubtractOperator(),
        rightTerm: { evaluate: expect.any(Function), isNumeric: true } as Term,
        isNumeric: true,
      },
      parseLength: 7,
      eval: 12,
    },
    {
      testCaseText: "parses sparse expressions correctly",
      parseText: "3 + 4",
      expected: {
        leftTerm: { evaluate: expect.any(Function), isNumeric: true } as Term,
        operator: new SubtractOperator(),
        rightTerm: { evaluate: expect.any(Function), isNumeric: true } as Term,
        isNumeric: true,
      },
      parseLength: 5,
      eval: 7,
    },
    {
      testCaseText: "parses sparse expressions with multiple operators",
      parseText: "3 + 4 + 3",
      expected: {
        leftTerm: { evaluate: expect.any(Function), isNumeric: true } as Term,
        operator: new SubtractOperator(),
        rightTerm: { evaluate: expect.any(Function), isNumeric: true } as Term,
        isNumeric: true,
      },
      parseLength: 9,
      eval: 10,
    },
    {
      testCaseText: "parses expressions with multiple operators and proper order",
      parseText: "3 + 4 * 3",
      expected: {
        leftTerm: { evaluate: expect.any(Function), isNumeric: true } as Term,
        operator: new SubtractOperator(),
        rightTerm: { evaluate: expect.any(Function), isNumeric: true } as Term,
        isNumeric: true,
      },
      parseLength: 9,
      eval: 10,
    },
  ];
  testCases.forEach((test) => {
    it(test.testCaseText, () => {
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
