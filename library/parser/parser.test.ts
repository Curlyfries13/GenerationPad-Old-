import fs from "fs";

import {
  parseTable,
  parseTableName,
  parseTableType,
  parseTableEntries,
  findMatchingBracket,
} from "./parser";
import { TableType } from "./types";
import { EvalText } from "./models";

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

describe("parses tables correctly", () => {
  const testCases = [
    {
      file: "./library/parser/test_files/table_parse.ipt",
      expected: [
        {
          title: "Table_Name",
          tableType: TableType.Weighted,
          tableDefault: "",
          entries: [
            {
              text: { rawText: "entry 1", evaluate: expect.any(Function) },
              weight: 1,
              lookupEnd: 1,
            },
            {
              text: { rawText: "entry 2", evaluate: expect.any(Function) },
              weight: 1,
              lookupEnd: 2,
            },
            {
              text: { rawText: "entry 3", evaluate: expect.any(Function) },
              weight: 1,
              lookupEnd: 3,
            },
          ],
        },
        42,
      ],
    },
    {
      file: "./library/parser/test_files/table_with_bogus.ipt",
      expected: [
        {
          title: "Table_Name",
          tableType: TableType.Weighted,
          tableDefault: "",
          entries: [
            {
              text: { rawText: "entry 1", evaluate: expect.any(Function) },
              weight: 1,
              lookupEnd: 1,
            },
            {
              text: { rawText: "entry 2", evaluate: expect.any(Function) },
              weight: 1,
              lookupEnd: 2,
            },
            {
              text: { rawText: "entry 3", evaluate: expect.any(Function) },
              weight: 1,
              lookupEnd: 3,
            },
          ],
        },
        42,
      ],
    },
    {
      file: "./library/parser/test_files/DictinoaryTable.ipt",
      expected: [
        {
          title: "dictionary table",
          tableType: TableType.Dictionary,
          tableDefault: "",
          entries: [
            {
              text: { rawText: "entry 1", evaluate: expect.any(Function) },
              key: "one",
            },
            {
              text: { rawText: "entry 2", evaluate: expect.any(Function) },
              key: "two",
            },
            {
              text: { rawText: "entry 3", evaluate: expect.any(Function) },
              key: "three",
            },
            {
              text: { rawText: "entry 4", evaluate: expect.any(Function) },
              key: "four",
            },
          ],
        },
        96,
      ],
    },
    {
      file: "./library/parser/test_files/LookupTable.ipt",
      expected: [
        {
          title: "Table_Name",
          tableType: TableType.Lookup,
          tableDefault: "default",
          entries: [
            {
              text: { rawText: "entry 1", evaluate: expect.any(Function) },
              lookupEnd: 2,
              lookupStart: 1,
            },
            {
              text: { rawText: "entry 2", evaluate: expect.any(Function) },
              lookupEnd: 5,
              lookupStart: 3,
            },
            {
              text: { rawText: "entry 3", evaluate: expect.any(Function) },
              lookupEnd: 9,
              lookupStart: 6,
            },
          ],
        },
        87,
      ],
    },
  ];
  testCases.forEach((test) => {
    it(`parses ${test.file} correctly`, () => {
      const data = fs.readFileSync(test.file, "utf-8");
      const result = parseTable(data);
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
