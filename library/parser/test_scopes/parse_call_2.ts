import { Table, EvalText } from "../models";
import { TableType, Entry } from "../types";

const entries: Entry[] = [
  {
    text: {
      rawText: "test1",
      evaluate: () => "test1",
    },
    weight: 1,
    lookupStart: 1,
    lookupEnd: 1,
  } as Entry,
  {
    text: {
      rawText: "test2",
      evaluate: () => "test2",
    },
    weight: 1,
    lookupStart: 2,
    lookupEnd: 2,
  } as Entry,
];

const testTable = new Table();
testTable.title = "testTable";
testTable.entries = entries;
testTable.getWeightedDefaultRoll();
testTable.generateRollExpression();
testTable.generatePickExpression();

const tables: Table[] = [testTable];

export const scope = {
  _tables: tables,
  variables: {},
};
