import fs from "fs";

import { parseGenerator } from "./parser";
import { Generator } from "./models";
import { tables as multiple_tables } from "./test_expected/multiple_tables";
import { tables as tableParse } from "./test_expected/table_parse";
import { tables as tableBogus } from "./test_expected/table_with_bogus";
import { tables as tableDictionary } from "./test_expected/DictionaryTable";
import { tables as LookupTable } from "./test_expected/LookupTable";

describe("parses generator files correctly", () => {
  const testCases = [
    {
      file: "./library/parser/test_files/multiple_tables.ipt",
      expected: multiple_tables,
      length: 99,
    },
    {
      file: "./library/parser/test_files/table_parse.ipt",
      expected: tableParse,
      length: 42,
    },
    {
      file: "./library/parser/test_files/table_with_bogus.ipt",
      expected: tableBogus,
      length: 58,
    },
    {
      file: "./library/parser/test_files/DictionaryTable.ipt",
      expected: tableDictionary,
      length: 135,
    },
    {
      file: "./library/parser/test_files/LookupTable.ipt",
      expected: LookupTable,
      length: 101,
    },
  ];
  testCases.forEach((test) => {
    it(`parses ${test.file} correctly`, () => {
      const data = fs.readFileSync(test.file, "utf-8");
      const expected = new Generator(test.expected, test.expected[0]);
      const result = parseGenerator(data);
      expect(result).toMatchObject([expected, test.length]);
    });
  });
});
