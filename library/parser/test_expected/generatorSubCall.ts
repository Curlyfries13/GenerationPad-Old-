import { TableType } from "../types";
import { Table } from "../models";

export const tables: Table[] = [
  {
    title: "Primary",
    tableType: TableType.Weighted,
    entries: [
      {
        text: { rawText: "[@Secondary]", evaluate: expect.any(Function) },
        weight: 1,
      },
    ],
  },
  {
    title: "Secondary",
    tableType: TableType.Weighted,
    entries: [
      {
        text: { rawText: "abcd", evaluate: expect.any(Function) },
        weight: 1,
      },
      {
        text: { rawText: "efgh", evaluate: expect.any(Function) },
        weight: 1,
      },
    ],
  },
] as Table[];
