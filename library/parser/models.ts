import { evaluatable, Table as iTable, Entry, TableType } from "./types";

import { Dice } from "./dice";

// TODO: Refactor this entire file - this is a wastebin of things that weren't
// categorized.

export class EvalText {
  rawText: string;
  evaluate: evaluatable;

  constructor() {
    this.rawText = "";
    this.evaluate = () => "";
  }
}

// TODO: consider splitting this into its own file
export class Table implements iTable {
  title: string;
  tableType: TableType;
  defaultRoll?: Dice;
  entries: Entry[];
  tableDefault: string;
  // inRoll is the "Roll" command defined by the table call, not any roll when
  // calling this
  roll: (inRoll?: number | string) => evaluatable;
  // picks work different from only
  pick: (index: number | string) => evaluatable;
  // Deck picks don't take any
  deckPick: () => evaluatable;
  picks: number[];

  constructor() {
    this.title = "";
    this.tableType = TableType.Weighted;
    this.entries = [];
    this.tableDefault = "";
    this.roll = () => () => "";
    this.pick = () => () => "";
    this.deckPick = () => () => "";
    this.picks = [];
  }

  getLookupDefaultRoll(): void {
    let min = undefined;
    let max = undefined;
    if (this.entries !== undefined) {
      for (let entry of this.entries) {
        min =
          min === undefined || entry.lookupStart < min
            ? entry.lookupStart
            : min;
        max =
          max === undefined || entry.lookupEnd > max ? entry.lookupEnd : max;
      }
      this.defaultRoll = new Dice();
      this.defaultRoll = Object.assign(this.defaultRoll, {
        magnitude: 1,
        sides: max - min + 1,
        mod_expr: "+" + String(min),
      });
    }
  }

  getWeightedDefaultRoll(): void {
    let max = undefined;
    if (this.entries !== undefined) {
      for (let entry of this.entries) {
        max =
          max === undefined || entry.lookupEnd > max ? entry.lookupEnd : max;
      }
    }
    this.defaultRoll = new Dice();
    this.defaultRoll = Object.assign(this.defaultRoll, {
      magnitude: 1,
      sides: max,
    });
  }

  generateRollExpression(): void {
    switch (this.tableType) {
      case TableType.Lookup:
        this.roll = (inRoll: number | string | undefined) => {
          // TODO: refactor to consolidate logic for truncating into the
          // expected input
          let roll = inRoll;
          if (inRoll === undefined) {
            roll = this.defaultRoll.roll();
          } else if (typeof inRoll === "string") {
            roll = parseInt(inRoll, 10) ?? 0;
          }
          for (let entry of this.entries) {
            if (entry.lookupStart >= roll && entry.lookupEnd <= roll) {
              return entry.text.evaluate;
            }
          }
          return this.tableDefault ? () => this.tableDefault : () => "";
        };
        break;
      case TableType.Dictionary:
        this.roll = (inRoll: string | undefined) => {
          for (let entry of out.entries) {
            if (inRoll === entry.key) {
              return entry.text.evaluate;
            }
          }
          return this.tableDefault ? () => this.tableDefault : () => "";
        };
        break;
      default:
        this.roll = (inRoll: string | number | undefined) => {
          // ignore inRoll
          let roll = this.defaultRoll.roll();
          for (let entry of this.entries) {
            if (
              entry.lookupEnd - entry.weight >= index &&
              entry.lookupEnd <= index
            ) {
              return entry.text.evaluate;
            }
          }
          return this.tableDefault ? () => this.tableDefault : () => "";
        };
        break;
    }
  }

  generatePickExpression(): void {
    switch (this.tableType) {
      case TableType.Lookup:
        // TODO: refactor to consolidate logic for truncating into the
        // expected input
        this.pick = (index: number | string) => {
          if (typeof index === "string") {
            index = parseInt(index, 10) ?? 1;
          }
          for (let entry of this.entries) {
            if (entry.lookupStart >= index && entry.lookupEnd <= index) {
              return entry.text.evaluate;
            }
          }
          return this.tableDefault ? () => this.tableDefault : () => "";
        };
        break;
      case TableType.Dictionary:
        this.pick = (index: number | string) => {
          if (typeof index === "number") {
            index = String(index);
          }
          for (let entry of this.entries) {
            if (entry.key === index) {
              return entry.text.evaluate;
            }
          }
          return this.tableDefault ? () => this.tableDefault : () => "";
        };
        break;
      default:
        this.pick = (index: number | string) => {
          if (typeof index === "string") {
            index = parseInt(index, 10);
          }
          for (let entry of this.entries) {
            if (
              entry.lookupEnd - entry.weight >= index &&
              entry.lookupEnd <= index
            ) {
              return entry.text.evaluate;
            }
          }
          return this.tableDefault ? () => this.tableDefault : () => "";
        };
        break;
    }
  }

  generateDeckPickExpression(): void {
    switch (this.tableType) {
      // NOTE: this is bugged (?) in the original code. Defaults to default roll
      case TableType.Lookup:
        this.generateRollExpression();
        this.deckPick = this.roll;
        break;
      case TableType.Dictionary:
        // this defaults to the default, or nothing
        this.deckPick = () => {
          return this.tableDefault ? () => this.tableDefault : () => "";
        };
        break;
      default:
        this.deckPick = () => {
          let valid = false;
          if (this.picks.length >= this.entries.length) {
            // no more picks available
            return () => "";
          }
          while (!valid) {
            let [roll, _] = this.defaultRoll.roll();
            let pick = this.entries.findIndex((entry, index) => {
              return (
                entry.lookupEnd - entry.weight >= roll &&
                entry.lookupEnd <= roll &&
                this.picks.includes(index)
              );
            });
            if (pick > -1) {
              valid = true;
              this.picks.push(pick);
              return this.entries[pick].text.evaluate;
            }
          }
          return () => "";
        };
        break;
    }
  }

  shuffle(): void {
    this.picks = [];
  }
}
export class Generator {
  tables: Table[];
  defaultTable?: Table;
  scope: { _tables: {}; variables: any };

  constructor(tables: Table[] = [], defaultTable?: Table) {
    this.tables = tables;
    this.defaultTable = defaultTable ? defaultTable : undefined;
    this.scope = { _tables: tables, variables: {} };
  }

  refineScope(): void {
    this.scope._tables = {};
    for (let table in this.tables) {
      this.scope._tables[table.title] = table;
    }
  }

  run(): string {
    return this.defaultTable ? this.defaultTable.roll()(this.scope) : "";
  }
}
