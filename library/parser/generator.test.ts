import fs from "fs";

import { parseGenerator } from "./parser";
import { TableType } from "./types";
import { EvalText, Generator, Table } from "./models";

describe("parses multiple tables correctly", () => {
  const tables: Table[] = [
    {
      title: "Table1",
      tableType: TableType.Weighted,
      entries: [
        {
          text: { rawText: "entry 1", evaluate: expect.any(Function) },
          weight: 1,
          lookupStart: 1,
          lookupEnd: 1,
        },
        {
          text: { rawText: "entry 2", evaluate: expect.any(Function) },
          weight: 2,
          lookupStart: 2,
          lookupEnd: 3,
        },
      ],
    },
    {
      title: "Table2",
      tableType: TableType.Lookup,
      entries: [
        {
          text: { rawText: "entry 3", evaluate: expect.any(Function) },
          lookupEnd: 1,
          lookupStart: 1,
        },
        {
          text: { rawText: "entry 4", evaluate: expect.any(Function) },
          lookupStart: 2,
          lookupEnd: 4,
        },
        {
          text: { rawText: "entry 5", evaluate: expect.any(Function) },
          lookupEnd: 5,
          lookupStart: 5,
        },
      ],
    },
  ] as Table[];
  const testCases = [
    {
      file: "./library/parser/test_files/multiple_tables.ipt",
      expected: [new Generator(tables, tables[0]), 99],
    },
  ];
  testCases.forEach((test) => {
    it(`parses ${test.file} correctly`, () => {
      const data = fs.readFileSync(test.file, "utf-8");
      const result = parseGenerator(data);
      expect(result).toMatchObject(test.expected);
    });
  });
});
