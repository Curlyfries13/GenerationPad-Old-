import fs from "fs";

import {
  parseTable,
  parseTableName,
  parseTableType,
  parseTableCall,
  findMatchingBracket,
  parseTableRollCommand,
  parseTableDefault,
  parseEntry,
  parseEvalText,
  parseExpression,
  parseCall,
  parseInlineTable,
  parseSubTableRoll,
  parseTableEntries,
  parseSubTablePick,
  parseSubTableDeckPick,
  parsePlaintextCall,
  parseVariableAssign,
  parseTableRollValue,
  parseCallTableName,
  parseCallParameters,
  parseFilter,
} from "./parser";
import { TableType, Entry } from "./types";
import { EvalText } from "./models";
import { Dice } from "./dice";

import { scope as scope1 } from "./test_scopes/parse_call_1";
import { scope as scope2 } from "./test_scopes/parse_call_2";

// This file tests several sub-components of the parser

it("ignores bad formatted table names", () => {
  const parse_text = "this is not a table";
  const result = parseTableName(parse_text);
  expect(result).toStrictEqual(["", 0]);
});

it("parses table names", () => {
  const parse_text = "Table: testTable\n";
  const result = parseTableName(parse_text);
  expect(result).toStrictEqual(["testTable", 17]);
});

it("ignores bad table types", () => {
  const parse_text = "this is a bad table Type";
  const result = parseTableType(parse_text);
  expect(result).toStrictEqual([TableType.Weighted, 0]);
});

it("parses lookup tables types", () => {
  const parse_text = "Type: lookup\n";
  const result = parseTableType(parse_text);
  expect(result).toStrictEqual([TableType.Lookup, 13]);
});

it("parses dictionary tables", () => {
  const parse_text = "Type: Dictionary\n";
  const result = parseTableType(parse_text);
  expect(result).toStrictEqual([TableType.Dictionary, 17]);
});

describe("parses table entries", () => {
  const testCases = [
    {
      text: "entry 1\nentry 2",
      expected: [
        [
          {
            text: { rawText: "entry 1", evaluate: expect.any(Function) },
            weight: 1,
          },
          {
            text: { rawText: "entry 2", evaluate: expect.any(Function) },
            weight: 1,
          },
        ],
        "entry 1\nentry 2".length,
      ],
    },
    {
      text: "entry 1\n",
      expected: [
        [
          {
            text: { rawText: "entry 1", evaluate: expect.any(Function) },
            weight: 1,
          },
        ],
        "entry 1\n".length,
      ],
    },
    {
      text: "entry 1\nentry 2\n\nno parse",
      expected: [
        [
          {
            text: { rawText: "entry 1", evaluate: expect.any(Function) },
            weight: 1,
          },
          {
            text: { rawText: "entry 2", evaluate: expect.any(Function) },
            weight: 1,
          },
        ],
        "entry 1\nentry 2\n".length,
      ],
    },
    {
      text: "entry 1\nentry 2\nentry 3",
      expected: [
        [
          {
            text: { rawText: "entry 1", evaluate: expect.any(Function) },
            weight: 1,
          },
          {
            text: { rawText: "entry 2", evaluate: expect.any(Function) },
            weight: 1,
          },
          {
            text: { rawText: "entry 3", evaluate: expect.any(Function) },
            weight: 1,
          },
        ],
        "entry 1\nentry 2\nentry 3".length,
      ],
    },
  ];
  testCases.forEach((test) => {
    it(`parses entries correctly '${test.text}' = ${test.expected} `, () => {
      const result = parseTableEntries(test.text);
      expect(result).toMatchObject(test.expected);
    });
  });
});

describe("parses entry line extensions", () => {
  const testCases = [
    {
      text: "cont&\ninued",
      expected: [
        [
          {
            text: { rawText: "continued", evaluate: expect.any(Function) },
            weight: 1,
          },
        ],
        "cont&\ninued".length,
      ],
    },
  ];
  testCases.forEach((test) => {
    it(`parses line continuation ${test.text}`, () => {
      const result = parseTableEntries(test.text);
      expect(result).toMatchObject(test.expected);
    });
  });
});

describe("finds matching brackets", () => {
  const testCases = [
    {
      testCaseText: "matches (1+2) correctly",
      parseText: "1+2)",
      start: "(",
      end: ")",
      expected: "1+2",
      parseLength: 3,
    },
    {
      testCaseText: "matches (1+(2+3-12)) correctly",
      parseText: "1+(2+3-12))",
      start: "(",
      end: ")",
      expected: "1+(2+3-12)",
      parseLength: 10,
    },
  ];
  testCases.forEach((test) => {
    it(test.testCaseText, () => {
      const result = findMatchingBracket(test.parseText, test.start, test.end);
      expect(result[0]).toStrictEqual(test.expected);
      expect(result[1]).toStrictEqual(test.parseLength);
    });
  });
});

describe("Parses Table call text correctly", () => {
  const testCases = [
    {
      testCaseText: "parses a simple table Call",
      parseText: "TableName",
      expected: {
        tableName: "TableName",
        rollValue: expect.any(Function),
        parameters: [],
        silent: false,
        tableRoll: false,
        hasVarAssign: false,
        varAssign: "",
      },
      parseLength: 9,
    },
    {
      testCaseText: "parses a table Call with assignment",
      parseText: "var=TestTable",
      expected: {
        tableName: "TestTable",
        rollValue: expect.any(Function),
        parameters: [],
        silent: false,
        tableRoll: false,
        hasVarAssign: true,
        varAssign: "var",
      },
      parseLength: 13,
    },
    {
      testCaseText: "parses a table Call with assignment",
      parseText: "bar==Test",
      expected: {
        tableName: "Test",
        rollValue: expect.any(Function),
        parameters: [],
        silent: true,
        tableRoll: false,
        hasVarAssign: true,
        varAssign: "bar",
      },
      parseLength: 9,
    },
  ];
  testCases.forEach((test) => {
    it(`${test.testCaseText}`, () => {
      const result = parseTableCall(test.parseText);
      expect(result[0]).toMatchObject(test.expected);
      expect(result[1]).toStrictEqual(test.parseLength);
    });
  });
});

describe("Parses Table names correctly", () => {
  const testCases = [
    {
      testCaseText: "parses a simple table name",
      parseText: "TableName",
      expected: "TableName",
      parseLength: 9,
    },
    {
      testCaseText: "only returns the table name without spaces",
      parseText: "TableWithSpaces  ",
      expected: "TableWithSpaces",
      parseLength: 17,
    },
    {
      testCaseText: "returns the first name without spaces",
      parseText: "bad table",
      expected: "bad",
      parseLength: 4,
    },
  ];
  testCases.forEach((test) => {
    it(`${test.testCaseText}`, () => {
      const result = parseCallTableName(test.parseText);
      expect(result[0]).toStrictEqual(test.expected);
      expect(result[1]).toStrictEqual(test.parseLength);
    });
  });
});

describe("parses Variable assignments", () => {
  const testCases = [
    {
      testCaseText: "parses a simple variable assignment",
      parseText: "varname=1234",
      expected: "varname",
      parseLength: 8,
      silent: false,
    },
    {
      testCaseText: "parses silent variable assignment",
      parseText: "testVar==abc",
      expected: "testVar",
      parseLength: 9,
      silent: true,
    },
    {
      testCaseText: "does not allow bad variable assignments",
      parseText: "test =no",
      expected: "",
      parseLength: 0,
      silent: false,
    },
    {
      testCaseText: "does not allow bad variable assignments",
      parseText: "test == no",
      expected: "",
      parseLength: 0,
      silent: false,
    },
  ];
  testCases.forEach((test) => {
    it(`${test.testCaseText}`, () => {
      const results = parseVariableAssign(test.parseText);
      expect(results[0]).toStrictEqual(test.expected);
      expect(results[1]).toStrictEqual(test.parseLength);
      expect(results[2]).toStrictEqual(test.silent);
    });
  });
});

describe("parses inline tables", () => {
  const testCases = [
    {
      testCaseText: "parses a simple inline table ",
      parseText: "|test1|test2",
      results: ["test1", "test2"],
    },
    {
      testCaseText: "parses an inline table with repeated elements",
      parseText: "|test1|test2|test3|test3|||",
      results: ["test1", "test2", "test3", ""],
    },
  ];
  testCases.forEach((test) => {
    it(`${test.testCaseText}`, () => {
      const table = parseInlineTable(test.parseText);
      const result = String(table.evaluate());
      expect(test.results.includes(result)).toBe(true);
    });
  });
});

describe("parses call paraemeters", () => {
  const testCases = [
    {
      testCaseText: "parses single parameter",
      parseText: "with param1",
      results: ["param1"],
      length: 11,
    },
    {
      testCaseText: "parses single parameter with filter",
      parseText: "with param1 >> sort",
      results: ["param1"],
      length: 14,
    },
    {
      testCaseText: "parses two parameters with filter",
      parseText: "with {$first}, {$second} >> sort",
      results: ["{$first}", "{$second}"],
      length: 27,
    },
  ];
  testCases.forEach((test) => {
    it(`${test.testCaseText}`, () => {
      const result = parseCallParameters(test.parseText);
      expect(result[0]).toStrictEqual(test.results);
      expect(result[1]).toStrictEqual(test.length);
    });
  });
});

// NOTE: this relies on parseTableCall
describe("parses sub-table rolls correctly", () => {
  const testCases = [
    {
      testCaseText: "parses a simple table roll",
      parseText: "someTable",
      expected: ["test1"],
      scope: scope1,
      scopeVars: [],
      scopeVarsResults: [],
    },
    {
      testCaseText: "parses a simple table roll with variable assignment",
      parseText: "var=testTable",
      expected: ["test1"],
      scope: scope2,
      scopeVars: ["var"],
      scopeVarsResults: ["test1"],
    },
    {
      testCaseText:
        "parses a simple table roll with silent variable assignment",
      parseText: "var==testTable",
      expected: [""],
      scope: scope2,
      scopeVars: ["var"],
      scopeVarsResults: ["test1"],
    },
  ];
  testCases.forEach((test) => {
    it(`${test.testCaseText}`, () => {
      const result = parseSubTableRoll(test.parseText);
      expect(test.expected.includes(String(result.evaluate(test.scope)))).toBe(
        true
      );
      test.scopeVars.forEach((variable: string, index: number): void => {
        expect(test.scope.variables.hasOwnProperty(variable)).toBe(true);
        expect(test.scope.variables[variable]).toEqual(
          test.scopeVarsResults[index]
        );
      });
    });
  });
});

describe("parses table roll commands", () => {
  const testCases = [
    {
      testCaseText: "parses a d20 roll",
      parseText: "Roll: 1d20\n",
      expected: new Dice("1d20"),
      parseLength: 11,
    },
  ];
  testCases.forEach((test) => {
    it(`${test.testCaseText}`, () => {
      const result = parseTableRollCommand(test.parseText);
      expect(result[0]).toMatchObject(test.expected);
      expect(result[1]).toStrictEqual(test.parseLength);
    });
  });
});

describe("parses table roll commands: negative tests", () => {
  const testCases = [
    {
      testCaseText: "does not parse non Roll table command",
      parseText: "type: Lookup",
      expected: undefined,
      parseLength: 0,
    },
  ];
  testCases.forEach((test) => {
    it(`${test.testCaseText}`, () => {
      const result = parseTableRollCommand(test.parseText);
      expect(result[0]).toBeUndefined();
      expect(result[1]).toStrictEqual(test.parseLength);
    });
  });
});

describe("parses table default command", () => {
  const testCases = [
    {
      testCaseText: "parses a simple default",
      parseText: "Default: default\n",
      expected: "default",
      length: 17,
    },
    {
      testCaseText: "does not parse other commands",
      parseText: "Type: Lookup\n",
      expected: "",
      length: 0,
    },
  ];
  testCases.forEach((test) => {
    it(`${test.testCaseText}`, () => {
      const result = parseTableDefault(test.parseText);
      expect(result[0]).toStrictEqual(test.expected);
      expect(result[1]).toStrictEqual(test.length);
    });
  });
});

describe("Parses entries correctly", () => {
  const testCases = [
    {
      testCaseText: "parses weighted entry correctly",
      parseText: "1: Entry Text",
      tableType: TableType.Weighted,
      result: {
        text: {
          rawText: "Entry Text",
          evaluate: expect.any(Function),
        } as EvalText,
        weight: 1,
      } as Entry,
    },
    {
      testCaseText: "parses lookup entry correctly",
      parseText: "2-5: Entry Text",
      tableType: TableType.Lookup,
      result: {
        text: {
          rawText: "Entry Text",
          evaluate: expect.any(Function),
        } as EvalText,
        lookupStart: 2,
        lookupEnd: 5,
      } as Entry,
    },
    {
      testCaseText: "parses dictionary entry correctly",
      parseText: "key: Entry Text",
      tableType: TableType.Dictionary,
      result: {
        text: {
          rawText: "Entry Text",
          evaluate: expect.any(Function),
        } as EvalText,
        key: "key",
      } as Entry,
    },
  ];
  testCases.forEach((test) => {
    it(`${test.testCaseText}`, () => {
      const result = parseEntry(test.parseText, test.tableType);
      expect(result).toStrictEqual(test.result);
    });
  });
});

// NOTE this relise on the expressionParser sub parser. This is an integration
// test to make sure that the wrapper functino works correctly
describe("parses expressions correctly", () => {
  const testCases = [
    {
      testCaseText: "parses addition correctly",
      parseText: "1+2",
      expected: {
        rawText: "1+2",
        evaluate: expect.any(Function),
      },
      result: 3,
    },
  ];
  testCases.forEach((test) => {
    it(`${test.testCaseText}`, () => {
      const result = parseExpression(test.parseText);
      expect(result).toMatchObject(test.expected);
      expect(result.evaluate()).toStrictEqual(test.result);
    });
  });
});

// NOTE this relies on parseInlineTable, parseSubTableRoll, parseSubTablePick,
// and parsePlaintextCall
describe("parses calls correctly", () => {});
