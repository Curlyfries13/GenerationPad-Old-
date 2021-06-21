import { TableType } from "../types";
import { Table } from "../models";

export const tables: Table[] = [
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
] as Table[];
