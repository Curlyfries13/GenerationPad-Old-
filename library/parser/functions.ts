import { evaluatable } from "./types";
import { Expression } from "./expression";

export class ExpressionFunction {
  innerExpression: Expression;
  evaluate: evaluatable;

  constructor(innerExpression: Expression) {
    this.innerExpression = innerExpression;
    this.evaluate = () => "";
  }
}

// TODO: implement max, min functions
// TODO: test and implement function exectuion on unexpected inputs.
export class SquareFunction extends ExpressionFunction {
  innerExpression: Expression;

  constructor(innerExpression: Expression) {
    super(innerExpression);
    this.innerExpression = innerExpression;
    this.evaluate = (scope?: any) => {
      let innerVal = this.innerExpression.evaluate(scope);
      if (typeof innerVal == "number") {
        return Math.sqrt(innerVal);
      } else {
        return 0;
      }
    };
  }
}

export class AbsFunction extends ExpressionFunction {
  innerExpression: Expression;

  constructor(innerExpression: Expression) {
    super(innerExpression);
    this.innerExpression = innerExpression;
    this.evaluate = (scope?: any) => {
      let innerVal = this.innerExpression.evaluate(scope);
      if (typeof innerVal == "number") {
        return Math.abs(innerVal);
      } else {
        return 0;
      }
    };
  }
}

export class RoundFunction extends ExpressionFunction {
  innerExpression: Expression;

  constructor(innerExpression: Expression) {
    super(innerExpression);
    this.innerExpression = innerExpression;
    this.evaluate = (scope?: any) => {
      let innerVal = this.innerExpression.evaluate(scope);
      if (typeof innerVal == "number") {
        return Math.round(innerVal);
      } else {
        return 0;
      }
    };
  }
}

export class FloorFunction extends ExpressionFunction {
  innerExpression: Expression;

  constructor(innerExpression: Expression) {
    super(innerExpression);
    this.innerExpression = innerExpression;
    evaluate = (scope?: any) => {
      let innerVal = this.innerExpression.evaluate(scope);
      if (typeof innerVal == "number") {
        return Math.floor(innerVal);
      } else {
        return 0;
      }
    };
  }
}

export class CeilFunction extends ExpressionFunction {
  innerExpression: Expression;

  constructor(innerExpression: Expression) {
    super(innerExpression);
    this.innerExpression = innerExpression;
    this.evaluate = (scope?: any) => {
      let innerVal = this.innerExpression.evaluate(scope);
      if (typeof innerVal == "number") {
        return Math.ceil(innerVal);
      } else {
        return 0;
      }
    };
  }
}

export class SignFunction extends ExpressionFunction {
  innerExpression: Expression;

  constructor(innerExpression: Expression) {
    super(innerExpression);
    this.innerExpression = innerExpression;
    this.evaluate = (scope?: any) => {
      let innerVal = this.innerExpression.evaluate(scope);
      if (typeof innerVal == "number") {
        return innerVal > 0 ? 1 : -1;
      } else {
        return 0;
      }
    };
  }
}

export class LengthFunction extends ExpressionFunction {
  innerExpression: Expression;

  constructor(innerExpression: Expression) {
    super(innerExpression);
    this.innerExpression = innerExpression;
    this.evaluate = (scope?: any) => {
      let innerVal = this.innerExpression.evaluate(scope);
      return String(innerVal).length;
    };
  }
}

export class TrimFunction extends ExpressionFunction {
  innerExpression: Expression;

  constructor(innerExpression: Expression) {
    super(innerExpression);
    this.innerExpression = innerExpression;
    this.evaluate = (scope?: any) => {
      let innerVal = this.innerExpression.evaluate(scope);
      return String(innerVal).trim();
    };
  }
}

export const functionMap: { [key: string]: typeof ExpressionFunction } = {
  sqrt: SquareFunction,
  abs: AbsFunction,
  round: RoundFunction,
  floor: FloorFunction,
  ceil: CeilFunction,
  sign: SignFunction,
  length: LengthFunction,
  trim: TrimFunction,
};

export const functionNumeric: { [key: string]: boolean } = {
  sqrt: true,
  abs: true,
  round: true,
  floor: true,
  ceil: true,
  sign: true,
  length: true,
  trim: false,
};
