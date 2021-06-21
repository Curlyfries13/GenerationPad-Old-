import { TableType } from "../types";
import { Table } from "../models";

export const tables: Table[] = [
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
