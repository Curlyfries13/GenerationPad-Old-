import { Entry, Filter, TableType, TableCall } from "./types";
import { Dice, DicePattern } from "./dice";
import { EvalText, Table, Generator } from "./models";
import { NonFilter } from "./filters";
import { Expression } from "./expression";
import { parseExpression as expressionParser } from "./expressionParser";

const expressionPattern = /\{.*\}/u;
const callPattern = /[.*]/u;

const variableName = "[a-zA-z]\\w*";

/**
 * Parse an entire generator file.
 *
 * @param {string} text - the plaintext of a generator file
 * @return {[Generator, number]} the Generator object created from this file
 * specification, followed by the number of characters parsed
 */
export function parseGenerator(text: string): [Generator, number] {
  const gapPattern = /^(\s*\n)+/u;
  const newlinePattern = /^.*\n+/u;
  let tables: Table[] = [];
  let parseText = text;
  let parseLength = -1;
  let currentTable: Table | null;
  let defaultTable: Table | undefined = undefined;

  while (parseText.length > 0 && parseLength != 0) {
    if (gapPattern.test(parseText)) {
      const gapMatch = gapPattern.exec(parseText);
      parseLength = gapMatch[0].length;
      parseText = parseText.slice(parseLength);
    }
    [currentTable, parseLength] = parseTable(parseText);
    if (parseLength != 0) {
      defaultTable = defaultTable ? defaultTable : currentTable;
      tables = tables.concat(currentTable);
      parseText = parseText.substring(parseLength);
    } else {
      // we could not find a table. Find the next newline, and keep trying
      const newlineMatch = newlinePattern.exec(parseText);
      parseLength = newlineMatch[0].length;
      parseText = parseText.slice(parseLength);
    }
  }

  let out = new Generator(tables);
  out.defaultTable = defaultTable;
  return [out, text.length - parseText.length];
}

/**
 * Parse a single table from a generator
 *
 * @param {string} text - Plaintext from a generator file
 * @return {[Table | null, number} the parsed table, or if the parse does not
 * produce a table null, followed by the number of characters parsed
 */
export function parseTable(text: string): [Table | null, number] {
  let parseText = text;
  let out: Table = new Table();
  let skip: number = 0;
  let parseLength = 0;

  [out.title, skip] = parseTableName(parseText);
  parseLength += skip;
  parseText = parseText.slice(skip);
  if (parseLength === 0) {
    // we didn't find a table title here
    return [null, 0];
  }

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

/**
 * Parse a Table Name specification. This will create a new table entry for a
 * generator.
 *
 * @param {string} text - the plaintext to be parsed
 * @return {[string, number]} the name of the table, followed by the number of
 * characters consumed
 */
export function parseTableName(text: string): [string, number] {
  const pattern = /^([Tt]able:\s*)(?<tableName>\w.*)\n/u;
  const match = pattern.exec(text);
  // null case shouldn't happen
  return match === null ? ["", 0] : [match.groups.tableName, match[0].length];
}

/**
 * Parse the type of table, one of weighted, lookup, or dictionary.
 *
 * Example:
 * Table: Robots
 * Type: Lookup <- this is the type
 *
 * @param {string} text - the plaintext to be parsed
 * @return {[TableType, number]} the table type followed by the number of
 * characters. Defaults to [Weighted, 0]
 */
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

/**
 * Parse a roll for a table. e.g.
 * Table: Humanoid
 * Type: Lookup
 * Roll: 1d10 <- this is the roll
 *
 * @param {string} text - the plaintext to be parsed
 * @return {[Dice | undefined} a Dice object matching the specification,
 * followed by the number of characters parsed. Defaults to an undefined Dice,
 * and 0 length
 */
export function parseTableRollCommand(
  text: string
): [Dice | undefined, number] {
  // TODO implement
  const pattern = new RegExp(
    "^(?<leader>[Rr]oll:\\s*)(" + DicePattern.source + ")\\n",
    "u"
  );
  const match = pattern.exec(text);
  if (match !== null) {
    return [new Dice(match[2]), match[0].length];
  }
  return [undefined, 0];
}

/**
 * Parse setting the table default.
 *
 * Example:
 *
 * Table: Default Table
 * type: dictionary
 * Default: value <- this is the default
 *
 * @param {string} text - The plaintext to be parsed
 * @return {[string, number]} The string return by default, followed by the
 * number of characters parsed
 */
export function parseTableDefault(text: string): [string, number] {
  const pattern = /^(([Dd]efault:\s*)(?<defaultText>.*)\n)/mu;
  const match = pattern.exec(text);
  return match === null ? ["", 0] : [match.groups.defaultText, match[0].length];
}

/**
 * Given a serries of entries, produce the list of Entry objects which would
 * belong to a Table.
 *
 * @param {string} text - the plaintext to be parsed
 * @param {TableType} [tableType] - the type of table that these entires belong
 * to. Defaults to Weighted
 * @return {[Entry[], number]} A list of entries that belong to the table,
 * followed by the number of characters parsed.
 */
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

/**
 * Parse a single entry in a table
 *
 * @param {string} text - the plaintext to be parsed]
 * @param {TableType} [tableType] - the type of table being parsed: defaults to
 * Weighted
 * @return {Entry} the resulting Entry object
 */
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

/**
 * Parse entry text, and return an EvalText object which can be evaluated when
 * needed.
 *
 * @param {string} text - the plaintext to be parsed
 * @return {EvalText} The resulting EvalText object
 */
export function parseEvalText(text: string): EvalText {
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
          [subparse, length] = findMatchingBracket(
            text.substring(i + 1),
            "{",
            "}"
          );
          skip = i + length;
          callStack = callStack.concat(parseExpression(subparse).evaluate);
          break;
        case "[":
          [subparse, length] = findMatchingBracket(
            text.substring(i + 1),
            "[",
            "]"
          );
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

/**
 * find matching end bracket, and return the match and its length
 *
 * @param {string} text - the plaintext to be parsed. Text should be the first
 * character after the initial bracket.
 * @param {string} startBracket - character representing the start of the
 * bracket, used for avoiding false positives on nested brackets.
 * @param {string} endBracket - the corresponding character that ends this
 * bracket
 * @throws {[TODO:name]} - [TODO:description]
 * @return {[string, number]} the resulting inner text for this bracket,
 * followed by the number of characters parsed
 */
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

/**
 * Parse an expression given by text within two brackets: this acts as a wrapper
 * for the expressionParser from expresisonParser.ts
 *
 * @param {string} text - the plaintext expression to be parsed
 * @return {EvalText} the resulting EvalText object, which produces the
 * expression's value on call.
 */
export function parseExpression(text: string): EvalText {
  // parse text here
  const [expression, _]: [expression: Expression, _: number] = expressionParser(
    text,
    0
  );
  const out = new EvalText();
  out.rawText = text;
  out.evaluate = (scope?: any) => expression.evaluate(scope);
  return out;
}

/**
 *  Parse text inside of square brackets. Usually this is a table call, but it
 *  can also just be basic text.
 *
 * TODO: set recursion depth guardrails: be careful of infinite recursion
 *
 * @param {string} text - the plaintext to be parsed. Pass text from within
 * paired square brackets.
 * @return {EvalText} the resulting EvalText object
 */
export function parseCall(text: string): EvalText {
  // check for sub-expressions
  let out = new EvalText();
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

/**
 * Parse an inline table expression.
 *
 * Example:
 * [|test1|test2]
 *
 * @param {string} text - the plaintext to be parsed. This should be text within
 * paired elements.
 * @return {EvalText} The resulting EvalText
 */
export function parseInlineTable(text: string): EvalText {
  const inlinePattern = /(\|\w*)/u;
  const inlineSplit = /\|/u;
  let out: EvalText = {
    rawText: "",
    evaluate: () => "",
  };
  let options: string[] = [];
  const match = inlinePattern.exec(text);
  const split = text.split(inlineSplit);
  if (match !== null) {
    for (const [index, subCall] of split.entries()) {
      if (index == 0) {
        // regex splitting using the '|' character always produces an empty
        // element at the front. We can't check for empty strings, because those
        // may be used, and would be valid text entries.
        // do nothing.
      } else if (callPattern.test(subCall) || expressionPattern.test(subCall)) {
        // TODO implement
        // parse subcalls and add it to the stack
      } else {
        // default add this to the evaluatable options
        options.push(subCall);
      }
    }
    out.rawText = match[0];
    out.evaluate = () => {
      return options[Math.floor(Math.random() * options.length)];
    };
  }
  return out;
}

/**
 * Parse a sub table roll. The text
 *
 * Example:
 * [@SomeTable]
 * or
 * [@var=SomeTable]
 *
 *
 * @param {string} text - the plaintext to be parsed. This is text within paired
 * square brackets, and after the initial @
 * @return {EvalText} the resulting EvalText object
 */
export function parseSubTableRoll(text: string): EvalText {
  // TODO: determine if this is a simple sub-table call, or has an expression
  const out = new EvalText();
  out.rawText = text;
  // Drop the length, it's not important for parsing this
  const [tableCall, _] = parseTableCall(text);
  // create the evaluation function for this EvalText
  out.evaluate = (scope?: any) => {
    let results: string[] = [];
    // TODO: refactor this variable to be less confusing with the outer scope
    let out = "";
    let rollTimes = 1;
    // get the table we roll on
    // TODO: if there if there is no table that matches this, then we need to
    // indicate and return (missing)
    let table = scope._tables.find((element: Table) => {
      return element.title === tableCall.tableName;
    });
    if (tableCall.tableRoll) {
      rollTimes = parseInt(tableCall.rollValue()) ?? 1;
    }
    for (let i = 0; i < rollTimes; i++) {
      // TODO: catch if table not found
      // TODO: table subrolls assign to the roll here
      let result = table.roll()(scope);
      if (tableCall.filterStack.length > 0) {
        for (let filter of tableCall.filterStack) {
          result = filter.applyFilter(result, scope);
        }
      }
      results = results.concat(result);
    }
    out = results.join("");
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

/**
 * Parse a subtable pick evaluation.
 * Example:
 * [! SomeTable]
 *
 * @param {string} text - the plaintext to be parsed. This should be the text
 * within a set of paired brackets
 * @return {EvalText} the resulting EvalText
 */
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
      return element.title === tableCall.tableName;
    });
    if (tableCall.tableRoll) {
      // TODO: catch if table not found
      // in this case, we need to pick whatever selection called here
      pick = tableCall.rollValue();
    }
    console.log(`parseTableCall: ${JSON.stringify(table)}`);
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
  return out;
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

/**
 * Parse a table call; this is called by the parseSubTableRoll,
 * parseSubTablePick and parseSubTableDeckPick.
 * generalized table parsing: expecting any of the following in this order
 * ['var=']{expr} {TableName}
 *
 * @param {string} text - the plaintext to be parsed.
 * @return {[TableCall, number]} The resulting TableCall and the number of
 * charcters parsed.
 */
export function parseTableCall(text: string): [TableCall, number] {
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
    // get the text befeore the filter stack, and see if there's a table call
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
  [out.tableName, parseLength] = parseCallTableName(parseText);
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

/**
 * Parse variable assignment inside a call.
 *
 * @param {string} text - the plaintext to be parsed
 * @return {[string, number, boolean]} return the variable being assigned, the
 * number of characters parsed and if the assignment is silent or not
 */
export function parseVariableAssign(text: string): [string, number, boolean] {
  const parsePattern = [
    "((?<silent>",
    variableName,
    "==)|(?<assign>",
    variableName,
    "=))",
  ].join("");
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
      varName = match.groups.silent.replace(/=/g, "");
      return [varName, length, true];
    }
  }
  return ["", 0, false];
}

/**
 * Parse a table roll detected from
 *
 * @param {string} text - the plaintext to be parsed
 * @return {(scope?) => string, number} an evaluatable function and the parse
 * length
 */
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

/**
 * given the inside of a table call return the tableName and the length of
 * the parsed text. If the table call has errors, then return nothing and a
 * parse length of 0
 *
 * TODO: may want to throw an exception here if the table call is bad
 *
 * @param {string} text - text to parse
 * @return {[string, number]} - the table name, and the lenth of the parse
 */
export function parseCallTableName(text: string): [string, number] {
  const tablePattern = /(?<tableName>[a-zA-Z]\w*)\s*/u;
  const match = text.match(tablePattern);
  if (match !== null) {
    const length = match[0].length;
    const tableName = match.groups.tableName;
    return [tableName, length];
  }
  return ["", 0];
}

/**
 * Given parse text find the parameters involved
 * Helper function for parseTableCall
 *
 * Example:
 * [@talbe with parameters]
 *
 * @param {string} text - the plaintext to be parsed
 * @return {[string[], number]} a group of parameters, followed by the length of
 * the parsed text.
 */
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
    .split(",")
    .map((x) => x.trim());
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
