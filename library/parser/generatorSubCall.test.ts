import fs from "fs";

import { parseGenerator } from "./parser";
import { Generator } from "./models";

import { tables as generatorSubCall } from "./test_expected/generatorSubCall";
import { tables as generatorSubCall2 } from "./test_expected/generatorSubCall2";

describe("parses generators files with subcalls", () => {
  const testCases = [
    {
      file: "./library/parser/test_files/generatorSubCall.ipt",
      expected: generatorSubCall,
      length: 56,
      eval: ["abcd", "efgh"],
    },
    {
      file: "./library/parser/test_files/generatorSubCall2.ipt",
      expected: generatorSubCall2,
      length: 125,
      eval: ["test A", "B tested"],
    },
  ];
  testCases.forEach((test) => {
    it(`parses ${test.file} correctly`, () => {
      const data = fs.readFileSync(test.file, "utf-8");
      const expected = new Generator(test.expected, test.expected[0]);
      const result = parseGenerator(data);
      expect(result).toMatchObject([expected, test.length]);
      console.log(JSON.stringify(result[0].run()));
      expect(test.eval.includes(result[0].run())).toBe(true);
    });
  });
});
