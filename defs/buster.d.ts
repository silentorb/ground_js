declare module "buster" {
  export function testCase(...args:any[]);
}

declare class Assertion {

  equals(...args:any[]);
  greater(first:any, second:any);
  this(value:any);
}

declare var assert:Assertion