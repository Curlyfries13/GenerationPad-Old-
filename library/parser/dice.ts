import { Dice as iDice } from "./types";

const DESIGNATION_PATTERN = "((?<mag>[0-9]{1,10})d(?<sides>[0-9]{1,4}))";
const EXPLODING_PATTERN =
  "(((?<exploding>(!!|!p|!))((?<expMode>(<=)|(>=)|[><=])(?<expVal>[0-9]{1,10}))?)?)";
const MULT_PATTERN = "(?<mult>[*][0-9]{1,10})";
const MOD_PATTERN = "(?<mod>[+-][0-9]{1,10})";
const MOD_EXPRESSION = "(?<mod>([*+-][0-9]{1,10})*)";
const DROP_PATTERN = "((?<drop>d[lh]?)(?<dropVal>[0-9]{1,10}))";
const KEEP_PATTERN = "((?<keep>k[lh]?)(?<keepVal>[0-9]{1,10}))";
const REROLL_PATTERN =
  "(?<reroll>ro?(?<rerollMode>(<=)|(>=)|[><=])(?<rerollVal>[0-9]{0,10}))";

export const DicePattern = RegExp(
  DESIGNATION_PATTERN +
    EXPLODING_PATTERN +
    "(" +
    DROP_PATTERN +
    "|" +
    KEEP_PATTERN +
    "|" +
    REROLL_PATTERN +
    ")*" +
    MOD_EXPRESSION,
  "ug"
);

function getRandomInt(min: number = 0, max: number): number {
  return Math.floor(Math.random() * (max - min) + min);
}

const KEEP_MAP = new Map();
KEEP_MAP.set("k", 1);
KEEP_MAP.set("kl", 0);
KEEP_MAP.set("kh", 1);

const DROP_MAP = new Map();
DROP_MAP.set("d", 0);
DROP_MAP.set("dl", 0);
DROP_MAP.set("dh", 1);

const COMP_MAP = new Map();
COMP_MAP.set("<=", 0);
COMP_MAP.set(">=", 1);
COMP_MAP.set("<", 2);
COMP_MAP.set(">", 3);
COMP_MAP.set("=", 4);

const EXPLODE_MAP = new Map();
EXPLODE_MAP.set("!", 0);
EXPLODE_MAP.set("!!", 1);
EXPLODE_MAP.set("!p", 2);

export class Dice implements iDice {
  magnitude: number;
  sides: number;
  modExpr?: string;
  results: [];
  exploding: boolean;
  explodingMode: number;
  explodingThresh: number;
  explodingComp: number;
  dropMode: number;
  keepMode: number;
  keepVal: number;
  dropVal: number;
  count: [];
  rerollMode: number;
  rerollThresh: number;
  rerollComp: number;

  constructor(expression: string = "") {
    this.magnitude = 0;
    this.sides = 0;
    this.modExpr = "";
    this.results = [];
    this.exploding = false;
    this.explodingMode = -1;
    this.explodingThresh = 0;
    this.explodingComp = -1;
    this.dropMode = -1;
    this.keepMode = -1;
    this.keepVal = 0;
    this.dropVal = 0;
    this.count = [];
    this.rerollMode = -1;
    this.rerollThresh = 0;
    this.rerollComp = -1;

    this.parseDice(expression);
  }

  roll(): [number, number[]] {
    //roll the selected dice and return the output
    let baseDice: number[] = [];
    let outResultsList: number[] = [];
    let outResult;

    for (let i = 0; i < this.magnitude; i++) {
      baseDice.concat(getRandomInt(1, this.sides));
    }

    outResultsList = baseDice;

    if (this.exploding && this.explodingMode != 1) {
      // TODO implement exploding limit configuration
      let diceSet = baseDice.filter((x) => x === this.sides);
      let exploded = this.explode(diceSet);

      outResultsList = baseDice.concat(exploded);
    }

    if (this.exploding && this.explodingMode === 1) {
      outResultsList = this.explode(baseDice);
    }

    if (this.rerollMode === 0) {
      // reroll happens before keep / drop
      let rerolls = outResultsList;
      for (let i = 0; i < outResultsList.length; i++) {
        let roll = outResultsList[i];
        let newRoll;

        if (this.rerollComp === 0 && roll <= this.rerollThresh) {
          while (newRoll === undefined || newRoll <= this.rerollThresh) {
            // WARNING this could take awhile!
            newRoll = getRandomInt(1, this.sides);
          }
        }

        if (this.rerollComp == 1 && roll >= this.rerollThresh) {
          while (newRoll === undefined || newRoll >= this.rerollThresh) {
            // WARNING this could take awhile!
            newRoll = getRandomInt(1, this.sides);
          }
        }

        if (this.rerollComp == 2 && roll < this.rerollThresh) {
          while (newRoll === undefined || newRoll < this.rerollThresh) {
            // WARNING this could take awhile!
            newRoll = getRandomInt(1, this.sides);
          }
        }

        if (this.rerollComp == 3 && roll > this.rerollThresh) {
          while (newRoll === undefined || newRoll > this.rerollThresh) {
            // WARNING this could take awhile!
            newRoll = getRandomInt(1, this.sides);
          }
        }

        if (this.rerollComp == 4 && roll == this.rerollThresh) {
          while (newRoll === undefined || newRoll == this.rerollThresh) {
            // WARNING this could take awhile!
            newRoll = getRandomInt(1, this.sides);
          }
        }

        if (newRoll !== undefined) {
          rerolls[i] = newRoll;
        }
      }
      outResultsList = rerolls;
    }

    if (this.rerollMode === 1) {
      let rerolls = outResultsList;
      for (let i = 0; i < outResultsList.length; i++) {
        let roll = outResultsList[i];
        let newRoll;

        if (this.rerollComp == 0 && roll <= this.rerollThresh) {
          newRoll = getRandomInt(1, this.sides);
        }

        if (this.rerollComp == 1 && roll >= this.rerollThresh) {
          newRoll = getRandomInt(1, this.sides);
        }

        if (this.rerollComp == 2 && roll < this.rerollThresh) {
          newRoll = getRandomInt(1, this.sides);
        }

        if (this.rerollComp == 3 && roll > this.rerollThresh) {
          newRoll = getRandomInt(1, this.sides);
        }

        if (this.rerollComp == 4 && roll == this.rerollThresh) {
          newRoll = getRandomInt(1, this.sides);
        }

        if (newRoll !== undefined) {
          rerolls[i] = newRoll;
        }
      }
      outResultsList = rerolls;
    }

    // following how roll 20 works, keep is applied then drop
    if (this.keepMode != -1 && this.keepVal < outResultsList.length) {
      let keepList = outResultsList.sort();

      if (this.keepMode === 0) {
        // keep low
        outResultsList = keepList.slice(0, this.keepVal);
      }

      if (this.keepMode === 1) {
        // keep high
        let l = outResultsList.length;
        outResultsList = keepList.slice(l - this.keepVal);
      }
    }

    if (this.dropMode !== -1) {
      let keepList = outResultsList.sort();

      if (this.dropVal >= outResultsList.length) {
        outResultsList = [];
      } else if (this.dropMode === 0) {
        // drop low
        outResultsList = keepList.slice(this.dropVal);
      } else if (this.dropMode === 1) {
        // drop high
        let l = outResultsList.length;
        outResultsList = keepList.slice(0, l - this.dropVal);
      }
    }

    outResult = outResultsList.reduce((acc, curr) => {
      return acc + curr;
    }, 0);
    // TODO: implement mods
    return [outResult, outResultsList];
  }

  // TODO: add an iteration / explode limit
  // TODO: implement dice exploding
  explode(diceSet: number[]): [] {
    if (!this.exploding) {
      return [];
    }
    if (diceSet === undefined || diceSet.length === 0) {
      return [];
    }
    return [];
  }

  parseDice(expression: string) {
    const match = [...expression.matchAll(DicePattern)];
    if (
      match !== null &&
      match[0] !== undefined &&
      match[0].groups !== undefined
    ) {
      const groupDict = match[0].groups;
      this.magnitude = parseInt(groupDict["mag"], 10);
      this.sides = parseInt(groupDict["sides"], 10);
      if (groupDict["exploding"] !== undefined) {
        let comp = "";
        let val = "";
        if (groupDict["expMode"] !== undefined) {
          comp = groupDict["expMode"];
          val = groupDict["expVal"];
        }
        this.exploding = true;
        this.explodingMode = EXPLODE_MAP.get(comp);
        this.explodingThresh = parseInt(val, 10);
      }
      if (groupDict["drop"] !== undefined) {
        this.dropMode = DROP_MAP.get(groupDict["drop"]);
        this.dropVal = parseInt(groupDict["dropVal"], 10);
      }
      if (groupDict["keep"] !== undefined) {
        this.keepMode = KEEP_MAP.get(groupDict["keep"]);
        this.dropVal = parseInt(groupDict["keepVal"], 10);
      }
      if (groupDict["reroll"] !== undefined) {
        if (groupDict["reroll"].startsWith("ro")) {
          this.rerollMode = 1;
        } else if (groupDict["reroll"].startsWith("r")) {
          this.rerollMode = 0;
        } else {
          this.rerollMode = -1;
        }

        if (
          groupDict["rerollMode"] === undefined ||
          groupDict["rerollMode"] === ""
        ) {
          this.rerollComp = 2;
        } else {
          this.rerollComp = COMP_MAP.get(groupDict["rerollMode"]);
        }
        this.rerollThresh = parseInt(groupDict["rerollVal"], 10);
      }
      if (groupDict["mod"] !== undefined) {
        this.modExpr = groupDict["mod"];
      }
    }
  }
}
