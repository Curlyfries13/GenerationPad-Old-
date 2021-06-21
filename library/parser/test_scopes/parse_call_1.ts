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
];

const tables: Table[] = [
  {
    title: "someTable",
    tableType: TableType.Weighted,
    entries: entries,
    tableDefault: "",
    roll: () => {
      return entries[0].text.evaluate;
    },
  } as Table,
];

export const scope = {
  _tables: tables,
};
