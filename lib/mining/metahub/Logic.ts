
module mining {

//  export interface Expression {
//    type:string
//  }

  export interface Statement {
    type:string
  }

  export interface Statement_Block extends Statement {
    path:string
    statements:Statement[]
  }

  export interface Constraint_Statement extends Statement {
    trellis:string
    property:string
    expression:Expression
  }

  export interface Constraint_Statement2 extends Statement {
    path:string[]
    expression:Expression
  }

  export interface Symbol_Statement extends Statement {
    name:string
    expression:Expression
  }

  export interface Function_Expression extends Expression {
    name:string
    arguments:Expression[]
  }

  export interface Function_Expression2 extends Expression {
    name:string
    inputs:Expression[]
  }

  export interface Reference_Expression extends Expression {
    path:string
  }

  export class Scope {
    symbols = {}
    constraints = {}
    _this
    parent:Scope

    constructor(parent:Scope = null) {
      this.parent = parent
    }

    add_symbol(name:string, value) {
      this.symbols[name] = value
    }

    get_symbol(name:string) {
      if (this.symbols[name] !== undefined)
        return this.symbols[name]

      if (this.parent)
        return this.parent.get_symbol(name)

      throw new Error('Symbol not found: ' + name + '.')
    }

    get_constraint(name:string) {
      if (this.constraints[name] !== undefined)
        return this.constraints[name]

      if (this.parent)
        return this.parent.get_constraint(name)

      throw new Error('Constraint not found: ' + name + '.')
    }
  }
/*
  export class Logic {
    static load(ground:Core, statements:Statement[]) {
      var scope = new Scope()

      for (var i = 0; i < statements.length; ++i) {
        var statement = statements[i]
        switch (statement.type) {
          case 'constraint':
            Logic.load_constraint(ground, <Constraint_Statement>statement, scope)
            break;
          case 'symbol':
            Logic.create_symbol(ground, <Symbol_Statement>statement, scope)
            break;
        }
      }
    }

    static load_constraint(ground:Core, source:Constraint_Statement, scope:Scope):MetaHub.Meta_Object {
      if (source.expression.type == 'function') {
        var func = <Function_Expression>source.expression
        if (func.name == 'count') {
          var reference = <Reference_Expression>func.arguments[0]
          var trellis = ground.sanitize_trellis_argument(source.trellis)
          var property = trellis.get_property(reference.path)
          if (property.get_relationship() !== landscape.Relationships.many_to_many)
            return new Record_Count(ground, source.trellis, reference.path, source.property)
          else
            return new Join_Count(ground, property, source.property)
        }
        else if (func.name == 'sum') {
          var sources = func.arguments.map((x)=> <MetaHub.Meta_Object>scope.symbols[(<Reference_Expression>x).path])
          return new Multi_Count(ground, source.trellis, source.property, sources)
        }
      }
    }

    static create_symbol(ground:Core, source:Symbol_Statement, scope:Scope) {
      var value = Logic.load_constraint(ground, <Constraint_Statement>source.expression, scope)
      scope.add_symbol(source.name, value)
    }

    static load2(ground:Core, statements:Statement[], scope:Scope = null) {
      scope = scope || new Scope()

      for (var i = 0; i < statements.length; ++i) {
        var statement = statements[i]
        switch (statement.type) {
          case 'constraint':
            Logic.load_constraint2(ground, <Constraint_Statement2>statement, scope)
            break;
          case 'symbol':
            Logic.create_symbol2(ground, <Symbol_Statement>statement, scope)
            break;
          case 'trellis_scope':
            Logic.trellis_scope(ground, <Statement_Block>statement, scope)
            break;
        }
      }
    }

    static load_constraint2(ground:Core, source:Constraint_Statement2, scope:Scope):MetaHub.Meta_Object {
      if (source.expression.type == 'function') {
        var func = <Function_Expression2>source.expression
        var target = source.path[0]
        var trellis = <Ground.landscape.Trellis>scope._this
        var constraint
        if (func.name == 'count') {
          var reference = <Reference_Expression>func.inputs[0]
          var property = trellis.get_property(reference.path[0])
          if (property.get_relationship() !== landscape.Relationships.many_to_many)
            constraint = new Record_Count(ground, trellis, reference.path, target)
          else
            constraint = new Join_Count(ground, property, target)
        }
        else if (func.name == 'sum') {
          var sources = func.inputs.map((x)=>
            <MetaHub.Meta_Object>scope.get_constraint((<Reference_Expression>x).path[0])
          )
          constraint = new Multi_Count(ground, trellis.name, target, sources)
        }

        scope.constraints[target] = constraint
        return constraint
      }
    }

    static create_symbol2(ground:Core, source:Symbol_Statement, scope:Scope) {
      var value = Logic.load_constraint2(ground, <Constraint_Statement2>source.expression, scope)
      scope.add_symbol(source.name, value)
    }

    static trellis_scope(ground:Core, source:Statement_Block, scope:Scope) {
        var new_scope = new Scope(scope)
      new_scope._this = ground.get_trellis(source.path[0])
      Logic.load2(ground, source.statements, new_scope)
    }

//    static call_function(ground:Core, source:Function_Expression, scope:Scope) {
//      switch (source.name) {
//        case 'count':
//          return function_count(ground, source, scope)
//      }
//    }
//
//    static function_count(ground:Core, source:Function_Expression, scope:Scope) {
//      var reference = <Reference_Expression>func.arguments[0]
//      var trellis = ground.sanitize_trellis_argument(source.trellis)
//      var property = trellis.get_property(reference.path)
//      if (property.get_relationship() !== landscape.Relationships.many_to_many)
//        return new Record_Count(ground, source.trellis, reference.path, source.property)
//      else
//        return new Join_Count(ground, property, source.property)
//    }
  }
  */
}