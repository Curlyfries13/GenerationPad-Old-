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
        text: { rawText: "test [@Tertiary1]", evaluate: expect.any(Function) },
        weight: 1,
      },
      {
        text: {
          rawText: "[@Tertiary2] tested",
          evaluate: expect.any(Function),
        },
        weight: 1,
      },
    ],
  },
  {
    title: "Tertiary1",
    tableType: TableType.Weighted,
    entries: [
      {
        text: { rawText: "A", evaluate: expect.any(Function) },
        weight: 1,
      },
    ],
  },
  {
    title: "Tertiary2",
    tableType: TableType.Weighted,
    entries: [
      {
        text: { rawText: "B", evaluate: expect.any(Function) },
        weight: 1,
      },
    ],
  },
] as Table[];
