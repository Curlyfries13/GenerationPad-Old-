import { EvalText } from "./models";

export enum TableType {
  Weighted,
  Lookup,
  Dictionary,
}

export interface Table {
  title: string;
  tableType: TableType;
  defaultRoll?: Dice;
  entries?: Entry[];
  tableDefault: string;
  roll: (inRoll?: number | string) => evaluatable;
}

// This may be extended based on
export interface Entry {
  // this may need to be evaluation text, i.e. text that _can_ be modified and
  // dynamically executed
  text: EvalText;
  weight?: number;
  lookupStart?: number;
  // for Lookup tables, this is the end of a range. For weighted tables this is
  // the backstop for rolling.
  lookupEnd?: number;
  key?: string;
}

export interface Filter {
  applyFilter: (inText: string, scope?: {}) => string;
  params: string[];
}

export interface Dice {
  // specify AdX[+-x/]m
  magnitude: number;
  sides: number;
  mod_expr?: string;
  roll: () => [number, number[]];
}

export interface TableCall {
  tableName: string;
  varAssign: string;
  rollValue: evaluatable;
  parameters: [];
  filterStack: Filter[];
  silent: boolean;
  tableRoll: boolean;
  hasVarAssign: boolean;
}

// TODO: deterimine if a promis-like would be better suited here
export interface evaluatable {
  (scope?: {}): string | number;
}
