/// <reference path="../references.ts"/>

module Ground {

//  export interface Expression {
//    type:string
//  }

  export interface Statement {
    type:string
  }

  export interface Constraint_Statement extends Statement {
    trellis:string
    property:string
    expression:Expression
  }

  export interface Function_Expression extends Expression {
    name:string
    arguments:Expression[]
  }

  export interface Reference_Expression extends Expression {
    path:string
  }

  export class Logic {
    static load(ground:Core, statements:Statement[]) {
      for (var i = 0; i < statements.length; ++i) {
        var statement = statements[i]
        if (statement.type == 'constraint') {
          Logic.load_constraint(ground, <Constraint_Statement>statement)
        }
      }
    }

    static load_constraint(ground:Core, source:Constraint_Statement) {
      if (source.expression.type == 'function') {
        var func = <Function_Expression>source.expression
        if (func.name == 'count') {
          var reference = <Reference_Expression>func.arguments[0]
          new Record_Count(ground, source.trellis, reference.path, source.property)
        }
      }
    }
  }
}