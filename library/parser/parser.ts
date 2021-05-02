import {
  Entry,
  evaluatable,
  Filter,
  FilterNames,
  TableType,
  TableCall,
} from "./types";
import { Dice, DicePattern } from "./dice";
import { EvalText, Table, Generator } from "./models";
import { NonFilter } from "./filters";

const expressionPattern = /\{.*\}/u;
const callPattern = /[.*]/u;

const variableName = "[a-zA-z]w*";

export function parseGenerator(text: string): [Generator, number] {
  const gapPattern = /^(\s*\n)+/u;
  let tables: Table[] = [];
  let parseText = text;
  let parseLength = -1;
  let currentTable: Table;
  let defaultTable: Table | undefined = undefined;

  while (parseText.length > 0 && parseLength != 0) {
    if (gapPattern.test(parseText)) {
      const gapMatch = gapPattern.exec(parseText);
      parseLength = gapMatch[0].length;
      parseText = parseText.slice(parseLength);
    }
    [currentTable, parseLength] = parseTable(parseText);
    defaultTable = defaultTable ? defaultTable : currentTable;
    tables = tables.concat(currentTable);
    parseText = parseText.substring(parseLength);
  }

  let out = new Generator(tables);
  out.defaultTable = defaultTable;
  return [out, text.length - parseText.length];
}

export function parseTable(text: string): [Table, number] {
  let parseText = text;
  let out: Table = new Table();
  let skip: number = 0;
  let parseLength = 0;

  [out.title, skip] = parseTableName(parseText);
  parseLength += skip;
  parseText = parseText.slice(skip);

  // TODO: these table setups might be allowable in different orders
  [out.tableType, skip] = parseTableType(parseText);
  parseLength += skip;
  parseText = parseText.slice(skip);
  [out.defaultRoll, skip] = parseTableRollCommand(parseText);
  parseLength += skip;
  parseText = parseText.slice(skip);
  [out.tableDefault, skip] = parseTableDefault(parseText);
  parseLength += skip;
  parseText = parseText.slice(skip);

  [out.entries, skip] = parseTableEntries(parseText, out.tableType);
  if (out.tableType === TableType.Lookup && out.defaultRoll === undefined) {
    out.getLookupDefaultRoll();
  } else if (out.tableType === TableType.Weighted) {
    out.getWeightedDefaultRoll();
  }
  out.generateRollExpression();
  out.generatePickExpression();
  parseLength += skip;

  // now fill in the roll function
  out.generateRollExpression();
  return [out, parseLength];
}

export function parseTableName(text: string): [string, number] {
  const pattern = /^([Tt]able:\s*)(?<tableName>\w.*)\n/u;
  const match = pattern.exec(text);
  // null case shouldn't happen
  return match === null ? ["", 0] : [match.groups.tableName, match[0].length];
}

export function parseTableType(text: string): [TableType, number] {
  const pattern = /^[Tt]ype:\s*(?<typeName>([Ww]eighted)|([Ll]ookup)|([Dd]ictionary))\n/u;
  const match = pattern.exec(text);
  if (match !== null) {
    switch (match.groups.typeName.toLowerCase()) {
      case "weighted":
        return [TableType.Weighted, match[0].length];
      case "lookup":
        return [TableType.Lookup, match[0].length];
      case "dictionary":
        return [TableType.Dictionary, match[0].length];
    }
  }
  // default, no skip and weighted table
  return [TableType.Weighted, 0];
}

function parseTableRollCommand(text: string): [Dice | undefined, number] {
  // TODO implement
  const pattern = new RegExp(
    "^(?<leader>[Rr]oll:*s)(" + DicePattern.source + ")\n",
    "u"
  );
  const match = pattern.exec(text);
  if (match !== null) {
    return [new Dice(match[2]), match[0].length];
  }
  return [undefined, 0];
}

function parseTableDefault(text: string): [string, number] {
  const pattern = /^(([Dd]efault:\s*)(?<defaultText>.*)\n)/mu;
  const match = pattern.exec(text);
  return match === null ? ["", 0] : [match.groups.defaultText, match[0].length];
}

export function parseTableEntries(
  text: string,
  tableType: TableType = TableType.Weighted
): [Entry[], number] {
  // TODO: range checking for lookup tables, or key collisions on dictionaries
  let parseLength = 0;
  let entries: Entry[] = [];
  // if there is a line continuation concatenate lines together
  let currentEntry = "";
  let concatenate = false;
  let range = 0;
  // TODO this line terminator doesn't match current functionality; a table does
  // not terminate until it finds a new 'Table:' marker, or EOF.
  const entryTerminator = /^\s*?$/mu;
  const lineConcatinate = /.*&$/mu;

  for (const line of text.split("\n")) {
    const match = line.match(entryTerminator);
    if (match !== null || line.length === 0) {
      // blank line encountered the entries are completed
      // mark these lines as parsed
      parseLength += line.length === 0 ? 1 : match[0].length;
      break;
    }
    const lineConcat = line.match(lineConcatinate);
    currentEntry = concatenate ? [currentEntry + line].join(" ") : line;
    // add the split newline
    parseLength += line.length + 1;
    let entryObject;
    if (lineConcat === null) {
      entryObject = parseEntry(currentEntry, tableType);
      // set up weighted entries for rolling.
      if (tableType === TableType.Weighted) {
        entryObject.lookupStart = range + 1;
        range =
          entryObject.weight === undefined
            ? range + 1
            : range + entryObject.weight;
        entryObject.lookupEnd = range;
      }
      entries = entries.concat(entryObject);
      concatenate = false;
      currentEntry = "";
    } else {
      // line concatenation detected, cut off the & character
      concatenate = true;
      currentEntry = currentEntry.substring(0, currentEntry.length - 1);
    }
  }
  return [entries, parseLength - 1];
}

// parse a single entry in a table
export function parseEntry(
  text: string,
  tableType: TableType = TableType.Weighted
): Entry {
  const out: Entry = {} as Entry;
  let parseText = text;
  const lookupPattern = /^(?<start>\d+)(-(?<end>\d+))?:/mu;
  const dictionaryPattern = /^(?<key>\w+):/mu;
  const weightedPattern = /^(?<weight>\d+):/mu;

  // declare this so our scoped version doesn't complain
  let match;
  switch (tableType) {
    case TableType.Lookup:
      // check for a header
      match = parseText.match(lookupPattern);
      // if there is no header, then there might be a problem
      if (match !== null) {
        out.lookupStart = parseInt(match.groups.start);
        out.lookupEnd = match.groups.end
          ? parseInt(match.groups.end)
          : out.lookupStart;
        parseText = parseText.substring(match.index + match[0].length);
      }
      break;
    case TableType.Dictionary:
      match = parseText.match(dictionaryPattern);
      // if there is no header, then there might be a problem
      if (match !== null) {
        out.key = match.groups.key;
        parseText = parseText.substring(match.index + match[0].length);
      }
      break;
    default:
      // weighted
      match = parseText.match(weightedPattern);
      if (match !== null) {
        out.weight = parseInt(match.groups.weight);
        parseText = parseText.substring(match.index + match[0].length);
      } else {
        out.weight = 1;
      }
      break;
  }
  out.text = parseEvalText(parseText.trim());
  return out;
}

export function parseEvalText(text: string): EvalText {
  // parse entry text, and return an EvalText object which can be evaluated when
  // needed
  const out: EvalText = { rawText: text, evaluate: () => text } as EvalText;
  const matchCheck = ["[", "{"];
  let callStack: ((scope?: {}) => string)[] = [];
  let plaintextStart = 0;
  let skip = -1;

  for (let i = 0; i < text.length; i++) {
    if (skip > i) {
      continue;
    }
    const character = text[i];
    if (matchCheck.includes(character)) {
      callStack = callStack.concat(() => text.substring(plaintextStart, i));
      let length: number, subparse: string;
      switch (character) {
        case "{":
          [subparse, length] = findMatchingBracket(text.substring(i), "{", "}");
          skip = i + length;
          callStack = callStack.concat(parseExpression(subparse).evaluate);
          break;
        case "[":
          [subparse, length] = findMatchingBracket(text.substring(i), "[", "]");
          skip = i + length;
          callStack = callStack.concat(parseCall(subparse).evaluate);
          break;
      }
      // begin parsing plaintext again.
      plaintextStart = skip;
    }
  }
  out.evaluate = function evaluate(scope?: {}) {
    return callStack
      .map((x) => {
        return x(scope);
      })
      .join("");
  };
  return out;
}

// find matching end brakcet, and return the match and its length
// text should be the first character after the initial bracket.
export function findMatchingBracket(
  text: string,
  startBracket: string,
  endBracket: string
): [string, number] {
  let stackDepth = 0;
  for (var i = 0; i < text.length; i++) {
    if (text[i] === startBracket) {
      stackDepth += 1;
    } else if (text[i] === endBracket && stackDepth === 0) {
      return [text.substring(0, i), i];
    } else if (text[i] === endBracket) {
      stackDepth -= 1;
    }
  }
  throw Error(`could not find matching bracket in text: ${text}`);
}

export function parseExpression(text: string): EvalText {
  // parse text here
}

// TODO: set recursion depth guardrails
// be careful of infinite recursion
export function parseCall(text: string): EvalText {
  // parse text inside of square brackets. Usually this is a table call, but it
  // can also just be basic text.
  // Pass text within paired square brackets

  // check for sub-expressions
  let out = EvalText();
  out.rawText = text;
  // inline table
  if (text.startsWith("|")) {
    return parseInlineTable(text);
  } else if (text.startsWith("@")) {
    return parseSubTableRoll(text.substring(1));
    //} else if (text.startsWith("!")) {
    // TODO: implement
    //return parseSubTableDeckPick(text.substring(1));
  } else if (text.startsWith("#")) {
    return parseSubTablePick(text.substring(1));
  } else {
    return parsePlaintextCall(text.substring(1));
  }
}

export function parseInlineTable(text: string): EvalText {
  const inlinePattern = /(\|)/gu;
  let out: EvalText = {
    rawText: "",
    evaluate: () => "",
  };
  let options: string[] = [];
  const match = text.match(inlinePattern);
  for (const subCall of match) {
    if (callPattern.test(subCall) || expressionPattern.test(subCall)) {
      // parse subcalls and add it to the stack
      // TODO implement
    } else {
      options.push(subCall.replace("|", ""));
    }
  }
  out.rawText = match[0];
  out.evaluate = () => {
    return options[Math.floor(Math.random() * options.length)];
  };
  return out;
}

export function parseSubTableRoll(text: string): EvalText {
  // TODO: determine if this is a simple sub-table call, or has an expression
  const out = new EvalText();
  out.rawText = text;
  // Drop the length, it's not important for parsing this
  const [tableCall, _] = parseTableCall(text);
  out.evaluate = (scope?: any) => {
    let results: string[] = [];
    // TODO: refactor this variable to be less confusing with the outer scope
    let out = "";
    let rollTimes = 1;
    let table = scope._tables.find((element: Table) => {
      element.title === tableCall.tableName;
    });
    if (tableCall.tableRoll) {
      rollTimes = parseInt(tableCall.rollValue()) ?? 1;
    }
    for (let i = 0; i < rollTimes; i++) {
      // TODO: catch if table not found
      let result = table.roll()(scope);
      if (tableCall.filterStack.length > 0) {
        for (let filter of tableCall.filterStack) {
          result = filter.applyFilter(result, scope);
        }
      }
      results = results.concat(result);
    }
    out = results.join(" ");
    // TODO: refactor and consolidate logic between this and parseSubTablePick
    // NOTE: scope variable assignment here
    if (tableCall.hasVarAssign) {
      scope.variables[tableCall.varAssign] = out;
      if (!tableCall.silent) {
        return out;
      }
      return "";
    }
    return out;
  };
  return out;
}

export function parseSubTablePick(text: string): EvalText {
  // TODO implement a sub-table pick, either dictionary or index
  const out = new EvalText();
  out.rawText = text;
  // Drop the length, it's not important for parsing this
  const [tableCall, _] = parseTableCall(text);
  out.evaluate = (scope?: any) => {
    let results: string[] = [];
    // TODO: refactor this variable to be less confusing with the outer scope
    let out = "";
    // TODO implement a sub-table pick default using the current table's index.
    let pick: string | number = 1;
    let table = scope._tables.find((element: Table) => {
      element.title === tableCall.tableName;
    });
    if (tableCall.tableRoll) {
      // in this case, we need to pick whatever selection called here
      pick = tableCall.rollValue();
    }
    out = table.pick(pick)(scope);
    if (tableCall.filterStack.length > 0) {
      for (let filter of tableCall.filterStack) {
        out = filter.applyFilter(out, scope);
      }
    }
    if (tableCall.hasVarAssign) {
      scope.variables[tableCall.varAssign] = out;
      if (!tableCall.silent) {
        return out;
      }
      return "";
    }
    return out;
  };
}

export function parseSubTableDeckPick(text: string) {
  // TODO implement a sub-table pick
}

export function parsePlaintextCall(text: string) {
  // TODO: check for filters and expressions.
  return {
    rawText: text,
    evaluate: () => text,
  };
}

export function parseTableCall(text: string): [TableCall, number] {
  // generalized table parsing: expecting any of the following in this order
  // ['var=']{expr} {TableName}
  let out: TableCall = {
    tableName: "",
    varAssign: "",
    rollValue: () => "",
    parameters: [],
    filterStack: [],
    silent: false,
    tableRoll: false,
    hasVarAssign: false,
  };
  const hasParameters = text.includes(" with ");
  out.hasVarAssign = text.includes("=");
  const hasFilter = text.includes(" >> ");
  let parseText = text;
  let parseLength = 0;
  // figure out if there's a roll for this table
  if (hasParameters) {
    const check = text.split(" with ")[0].trim();
    if (check.split(" ").length > 1) {
      out.tableRoll = true;
    }
  } else if (!hasParameters && hasFilter) {
    const check = text.split(" >> ")[0].trim();
    if (check.split(" ").length > 1) {
      out.tableRoll = true;
    }
  } else if (!hasParameters && !hasFilter) {
    if (text.split(" ").length > 1) {
      out.tableRoll = true;
    }
  }

  // check for var assignment
  if (out.hasVarAssign) {
    [out.varAssign, parseLength, out.silent] = parseVariableAssign(parseText);
    parseText = parseText.substring(parseLength);
  }
  if (out.tableRoll) {
    [out.rollValue, parseLength] = parseTableRollValue(text);
    parseText = parseText.substring(parseLength);
  }
  // parse table and number of times rolled
  [out.tableName, parseLength] = parseCallTableName(text);
  parseText = parseText.substring(parseLength);

  if (hasParameters) {
    [out.parameters, parseLength] = parseCallParameters(text);
    parseText = parseText.substring(parseLength);
  }
  if (out.hasFilter) {
    // parse filter stack
    [out.filterStack, parseLength] = parseFilter(text);
    parseText = parseText.substring(parseLength);
  }

  return [out, text.length - parseText.length];
}

// parse variable assignment, return the function for
export function parseVariableAssign(text: string): [string, number, boolean] {
  const parsePattern = [
    "((?<silent>",
    variableName,
    "==)|(?<assign>)",
    variableName,
    "=))",
  ].join();
  const regex = new RegExp(parsePattern, "ug");
  const match = regex.exec(text);
  let varName = "";

  if (match != null) {
    const length = match[0].length;
    if (match.groups.assign !== undefined) {
      // assign, there's feedback
      varName = match.groups.assign.replace("=", "");
      return [varName, length, false];
    } else if (match.groups.silent !== undefined) {
      // silent assign, meaning there's no feedback
      varName = match.groups.assign.replace("=", "");
      return [varName, length, true];
    }
  }
  return ["", 0, false];
}

export function parseTableRollValue(
  text: string
): [(scope?: {}) => string, number] {
  const matchCheck = ["[", "{"];
  const breakCheck = [" "];
  let subparse, length;

  for (let i = 0; i < text.length; i++) {
    const character = text[i];
    if (matchCheck.includes(character)) {
      switch (character) {
        case "{":
          [subparse, length] = findMatchingBracket(text.substring(i), "{", "}");
          return [parseExpression(subparse).evaluate, length];
        case "[":
          [subparse, length] = findMatchingBracket(text.substring(i), "[", "]");
          return [parseCall(subparse).evaluate, length];
      }
    } else if (breakCheck.includes(character)) {
      return [() => text.substr(0, i), i];
    }
  }
  // not sure how this would happen exactly
  return [() => text, text.length];
}

// parse a table call; return the table name and the parse length
export function parseCallTableName(text: string): [string, number] {
  const tablePattern = /(?<tableName>[a-zA-Z]\w*)\s*/gu;
  const match = text.match(tablePattern);
  if (match !== null) {
    const length = match[0].length;
    const tableName = match.groups.tableName;
    return [tableName, length];
  }
  return ["", 0];
}

export function parseCallParameters(text: string): [string[], number] {
  let endparse = text.length;
  const filterTerminated = text.includes(">>");
  if (filterTerminated) {
    length = text.indexOf(">>") + 2;
    endparse = text.indexOf(">>");
  } else {
    length = text.length;
  }
  const params = text
    .substring(0, endparse)
    .replace("with ", "")
    .trim()
    .split(",");
  return [params, length];
}

// TODO: complete implementation
export function parseFilter(text: string): [Filter[], number] {
  let filterStack: Filter[] = [];
  filterStack = text.split(">>").forEach((part: string) => {
    return NonFilter();
  });
  return [filterStack, text.length];
}
