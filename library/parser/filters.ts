import { Filter } from "./types";

export const FilterNames = [
  "at",
  "bold",
  "each",
  "eachchar",
  "implode",
  "italic",
  "left",
  "length",
  "lower",
  "ltrim",
  "+-",
  "plusminus",
  "proper",
  "replace",
  "reverse",
  "right",
  "rtrim",
  "sort",
  "substr",
  "trim",
  "underline",
  "upper",
];

export class AtFilter implements Filter {
  // TODO: Params can be dynamic at runtime
  params: string[] = [];
  applyFilter = (inText: string) => {
    return params ? inText.indexOf(this.params[0]) : 0;
  };
}

// pass the result of an evaulated text into another table as a parameter
// expects a single parameter
export class EachFilter implements Filter {
  params: string[] = [];
  applyFilter = (inText: string, scope?: {}) => {
    params ? scope._tables[this.params[0]].roll(inText) : "";
  };
}

// a Filter placeholder for non-implemented filters
export class NonFilter implements Filter {
  applyFilter = (inText: string, scope?: {}, ...params: string[]) => {
    return inText;
  };
}
