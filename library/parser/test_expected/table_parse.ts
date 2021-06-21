import { TableType } from "../types";
import { Table } from "../models";

export const tables: Table[] = [
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
] as Table[];
