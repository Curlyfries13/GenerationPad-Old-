import { TableType } from "../types";
import { Table } from "../models";

export const tables: Table[] = [
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
] as Table[];
