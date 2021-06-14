import { evaluatable } from "./types";

export interface Term {
  // TODO: add toString
  evaluate: (scope?: any) => string | number;
  isNumeric: boolean;
  // this represents the depth of this Term
  level: number;
}

export class ParserError extends Error {
  // TODO: implement line logging
  constructor(message?: string) {
    const outMessage = `Parser error: ${message}`;
    super(outMessage);
  }
}

export class Expression implements Term {
  terms: Term[];
  operators: Operator[];
  // this represents the depth of this expression.
  level: number;
  isNumeric: boolean;
  evaluate: (scope?: any) => string | number;

  constructor(terms?: Term[], operators?: Operator[], level?: 0) {
    // Default execution to produce empty string
    this.evaluate = () => "";
    this.level = level ? level : 0;
    if (this.argsOperatorTermCountMatch(terms, operators)) {
      // @ts-ignore argsOperatorTermCountMatch checks for this
      this.terms = terms;
      // @ts-ignore argsOperatorTermCountMatch checks for this
      this.operators = operators;
      this.isNumeric = this.terms.reduce((acc, curr) => {
        acc = acc && curr.isNumeric;
        return acc;
      }, false);
      this.generateEval();
    } else {
      // placeholder implementation: prefer initialization
      // TODO: add warn about unimplemented evaluation?
      this.terms = [
        {
          evaluate: () => "",
          isNumeric: true,
          level: level !== undefined ? level : 0,
        },
      ];
      this.operators = [];
      this.isNumeric = false;
      this.evaluate = () => "";
    }
  }

  // helper method to determine if the number of terms and operators makes sense
  argsOperatorTermCountMatch(terms?: Term[], operators?: Operator[]): boolean {
    return (
      terms !== undefined &&
      operators !== undefined &&
      terms.length > 0 &&
      terms.length === operators.length - 1
    );
  }

  // similar to above, but for self validation
  operatorTermCountMatch(): boolean {
    return (
      this.terms !== undefined &&
      this.operators !== undefined &&
      this.terms.length > 0 &&
      this.operators.length === this.terms.length - 1
    );
  }

  generateEval(): void {
    if (this.terms === undefined || !this.operatorTermCountMatch()) {
      // there's no terms, or a mismatch between terms and operators. Default to
      // an "invalid expression" return
      this.evaluate = (scope?: any) => {
        return "(Invalid expression)";
      };
      return;
    } else {
      // TODO: if there are only 2 terms and one operator, then we may want to
      // simplify execution

      // generate an operator order mapping: this will be an ordered array of
      // each operator index. Order is determined by operator presidence then by
      // order.
      const order = this.operators
        .map((curr: Operator, index: number) => {
          return [curr.presidence, index];
        })
        .sort((a, b) => {
          if (a[0] < b[0]) {
            // operator of higher precidence, sort b before a
            return 1;
          } else if (a[0] > b[0]) {
            return -1;
          } else if (a[1] > b[1]) {
            // operators of equal presidence, sort in left-to-right order
            // NOTE: we could just return 0 for both
            return 1;
          } else {
            return -1;
          }
        });

      // keep track of which terms we've collapsed
      let collapsed: number[] = [];
      order.forEach((ordering) => {
        const leftTerm: Term = this.terms[ordering[1]];
        // get the first non-collapsed term
        const rightTerm = this.terms.filter((_, i) => {
          return i >= ordering[1] + 1 && !collapsed.includes(i);
        })[0];
        const rightTermIndex = this.terms.indexOf(rightTerm);
        let innerEval: evaluatable = (scope?: any) => {
          return this.operators[ordering[1]].apply(leftTerm, rightTerm, scope);
        };
        let combinedTerm: Term = {
          isNumeric: leftTerm.isNumeric && rightTerm.isNumeric,
          evaluate: innerEval,
          level:
            leftTerm.level < rightTerm.level ? leftTerm.level : rightTerm.level,
        };
        // replace the right term with the combined term and continue
        this.terms[rightTermIndex] = combinedTerm;
        // the left term is now collapsed (do not use in future calculations)
        // therefore, the right term (now combined) should be used.
        collapsed.push(ordering[1]);
      });

      this.evaluate = function (scope?: any) {
        // collapsed term is always last in the order
        return this.terms[this.terms.length - 1].evaluate(scope);
      };
    }
  }
}

// Helper function to determine if a term/expression is an Expression
function determineIfExpression(
  toBeDetermined: Expression | Term
): toBeDetermined is Expression {
  if ((toBeDetermined as Expression).type) {
    return true;
  }
  return false;
}

export class VarAccess implements Term {
  evaluate: (scope?: any) => string | number;
  level: number;
  isNumeric: boolean;

  constructor(varName: string, level = 0) {
    this.isNumeric = true;
    this.level = level;
    this.evaluate = (scope?: any) => {
      return scope.variables[varName] === undefined
        ? ""
        : scope.variables[varName];
    };
  }
}

export interface Operator {
  presidence: number;
  apply(leftTerm: Term, rightTerm: Term, scope?: any): any;
}

export class AddOperator implements Operator {
  presidence: number;
  constructor() {
    this.presidence = 1;
  }
  apply(leftTerm: Term, rightTerm: Term, scope?: any) {
    if (leftTerm.isNumeric && rightTerm.isNumeric) {
      return (
        Number(leftTerm.evaluate(scope)) + Number(rightTerm.evaluate(scope))
      );
    } else {
      return (
        String(leftTerm.evaluate(scope)) + String(rightTerm.evaluate(scope))
      ).toString();
    }
  }
}

export class SubtractOperator implements Operator {
  presidence: number;
  constructor() {
    this.presidence = 1;
  }
  apply(leftTerm: Term, rightTerm: Term, scope?: any) {
    return Number(leftTerm.evaluate(scope)) - Number(rightTerm.evaluate(scope));
  }
}

export class DivideOperator implements Operator {
  presidence: number;
  constructor() {
    this.presidence = 2;
  }
  apply(leftTerm: Term, rightTerm: Term, scope?: any) {
    return Number(leftTerm.evaluate(scope)) / Number(rightTerm.evaluate(scope));
  }
}

export class MultiplyOperator implements Operator {
  presidence: number;
  constructor() {
    this.presidence = 2;
  }
  apply(leftTerm: Term, rightTerm: Term, scope?: any) {
    return Number(leftTerm.evaluate(scope)) * Number(rightTerm.evaluate(scope));
  }
}

export class PowerOperator implements Operator {
  presidence: number;
  constructor() {
    this.presidence = 2;
  }
  apply(leftTerm: Term, rightTerm: Term, scope?: any) {
    return (
      Number(leftTerm.evaluate(scope)) ** Number(rightTerm.evaluate(scope))
    );
  }
}
