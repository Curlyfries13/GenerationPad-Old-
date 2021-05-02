export interface Term {
  // TODO: add toString
  evaluate: (scope?: any) => string | number;
  isNumeric: boolean;
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
  leftTerm: Term | Expression;
  rightTerm?: Term | Expression;
  operator?: Operator;
  // this represents the depth of this expression.
  level: number;
  isNumeric: boolean;
  evaluate: (scope?: any) => string | number;

  constructor(
    leftTerm?: Term,
    operator?: Operator,
    rightTerm?: Term,
    level?: 0
  ) {
    this.evaluate = () => "";
    this.level = level ? level : 0;
    if (leftTerm !== undefined) {
      this.leftTerm = leftTerm;
      this.operator = operator;
      this.rightTerm = rightTerm;
      this.isNumeric =
        this.operator !== undefined && this.rightTerm !== undefined
          ? this.leftTerm.isNumeric && this.rightTerm.isNumeric
          : this.leftTerm.isNumeric;
      this.generateEval();
    } else {
      // placeholder implementation: prefer initialization
      this.leftTerm = {
        evaluate: () => "",
        isNumeric: true,
        level: level !== undefined ? level : 0,
      };
      this.isNumeric = false;
      this.evaluate = () => "";
    }
  }

  generateEval(): void {
    if (this.leftTerm === undefined) {
      // there's no terms
      this.evaluate = (scope?: any) => {
        return "(Invalid expression)";
      };
    }
    if (this.operator !== undefined && this.rightTerm !== undefined) {
      this.evaluate = function (scope?: any) {
        /* tslint:disable-next-line */
        return this.operator.apply(
          this.leftTerm,
          this.rightTerm as Term,
          scope
        );
      };
    } else if (this.operator !== undefined && this.rightTerm === undefined) {
      this.evaluate = (scope?: any) => {
        // TODO: 1.0 should include the toString for the expression
        return "(Invalid expression)";
      };
    }
  }
}

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
  isNumeric: boolean;

  constructor(varName: string) {
    this.isNumeric = true;
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
      if (
        determineIfExpression(rightTerm) &&
        rightTerm.operator !== undefined
      ) {
        rightTerm as Expression;
        if (
          rightTerm.level === leftTerm.level &&
          rightTerm.operator.presidence > this.presidence
        ) {
        }
      } else {
        return (
          Number(leftTerm.evaluate(scope)) + Number(rightTerm.evaluate(scope))
        );
      }
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
