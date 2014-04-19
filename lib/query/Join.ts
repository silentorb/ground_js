/// <reference path="../references.ts"/>

module Ground {

  export interface IJoin {
    render():string
  }

  export interface ITable_Reference {
    get_table_name():string
    query_reference():string
    query_identity():string
  }

  export interface Join_Trellis {
    get_table_name():string
    get_alias():string
    query_identity():string
  }

  export class Join_Trellis_Wrapper implements Join_Trellis {
    trellis:Trellis
    alias:string

    constructor(trellis:Trellis, alias:string = null) {
      this.trellis = trellis
      this.alias = alias || trellis.get_table_name()
    }

    static create_using_property(trellis:Trellis, property:Property):Join_Trellis_Wrapper {
      var alias = Join.generate_table_name(trellis, property)
      return new Join_Trellis_Wrapper(trellis, alias)
    }

    get_alias():string {
      return this.alias
    }

    get_table_name():string {
      return this.trellis.get_table_name()
    }

    query_identity():string {
      return this.get_alias() + '.' + this.trellis.get_primary_property().get_field_name()
    }
  }

  export class Cross_Trellis implements Join_Trellis {
    name:string
    alias:string
    properties:Join_Property[]

    constructor(property:Property) {
      var names = [property.parent.get_plural(), property.other_trellis.get_plural()]
      var temp = names.sort()
      this.name = temp.join('_')

      // Add the property name in case there are cross joins in both directions
      this.alias = 'cross_' + this.name + '_' + property.name
      this.properties = Cross_Trellis.create_properties(this, property)
    }

    private static create_properties(cross:Cross_Trellis, property:Property):Join_Property[] {
      var other_property = property.get_other_property()
      var result = [
        Join_Property.create_from_property(property, cross),
        new Join_Property(cross, property.parent, property.parent.name, "reference"),
        new Join_Property(cross, other_property.parent, other_property.parent.name, "reference"),
        Join_Property.create_from_property(other_property, cross)
      ]

      Join_Property.pair(result[0], result[1])
      Join_Property.pair(result[2], result[3])
      return result
    }

    get_alias():string {
      return this.alias
    }

    get_table_name():string {
      return this.name
    }

    query_identity():string {
      throw new Error('Cross_Trellis.query_identity() should never be called.' +
        '  Cross_Reference only has references, not identities')
    }
  }

  export class Join_Property {
    parent:ITrellis
    other_trellis:ITrellis
    field_name:string
    type:string
    other_property:Join_Property

    constructor(parent:ITrellis, other_trellis:ITrellis, field_name:string, type:string, other_property:Join_Property = null) {
      this.parent = parent
      this.other_trellis = other_trellis
      this.field_name = field_name
      this.type = type
      this.other_property = other_property
    }

    static create_from_property(property:Property, other_trellis:ITrellis = null, other_property:Join_Property = null):Join_Property {
      return new Join_Property(
        property.parent,
        other_trellis || property.other_trellis,
        property.get_field_name(),
        property.type,
        other_property
      )
    }

    static pair(first:Join_Property, second:Join_Property) {
      first.other_property = second
      second.other_property = first
    }
  }

  export class Join_Tree {
    property:Property
    trellis:Trellis
    children:Join_Tree[] = []

    constructor(property:Property, trellis:Trellis) {
      this.property = property
      this.trellis = trellis
    }

    static get(tree:Join_Tree[], property:Property, next:Trellis):Join_Tree {
      for (var i = 0; i < tree.length; ++i) {
        var branch = tree[i]
        if (branch.property.name == property.name && branch.trellis.name === next.name)
          return branch
      }
      return null
    }
  }

  export class Join {

    static generate_table_name(trellis:Trellis, property:Property):string {
      return 'link_' + trellis.name + '_' + property.get_field_name()
    }

    static get_last_reference(property_chain:Property[]):Property {
      var property = property_chain[property_chain.length - 1]

      // If the last property isn't a reference, the property before it must be a reference
      // or the chain is invalid.
      if (!property.other_property)
        return property_chain[property_chain.length - 2]
    }

    static paths_to_tree(base:Trellis, paths:any[]):Join_Tree[] {
      var result:Join_Tree[] = [], target:Join_Tree[], path:Property[]

      for (var i = 0; i < paths.length; ++i) {
        var trellis = base
        path = paths[i]
        target = result
        for (var x = 0; x < path.length - 1; ++x) {
          var property = path[x]
          var next:Trellis = path[x + 1].parent
          var branch = Join_Tree.get(target, property, next)
          if (!branch) {
            branch = new Join_Tree(property, next)
            target.push(branch)
          }
          target = branch.children
        }
      }

      return result
    }

    private static convert(branch:Join_Tree, previous:Join_Trellis, result:IJoin[]):Join_Trellis {
      var join_property:Join_Property, cross:Cross_Trellis, join_trellis
      if (branch.property.get_relationship() == Relationships.many_to_many) {
        cross = new Cross_Trellis(branch.property)
        result.push(new Reference_Join(cross.properties[0], previous, cross))
        previous = cross
        join_property = cross.properties[2]
      }
      else {
        join_property = Join_Property.create_from_property(branch.property)
        Join_Property.pair(join_property, Join_Property.create_from_property(branch.property.get_other_property()))
      }

      var other_property = branch.property.get_other_property()

      // joined trellises usually require two trellis properties to be useful, and sometimes those properties
      // are not in the same table, so composite join must be added to bridge the gap.
      if (branch.property.type == 'list' && other_property.parent !== branch.trellis) {
        join_trellis = Join_Trellis_Wrapper.create_using_property(branch.trellis, branch.property)
        var alias = 'composite_' + join_trellis.alias + '_' + branch.property.other_trellis.name
        var join_trellis2 = new Join_Trellis_Wrapper(branch.property.other_trellis, alias)
        result.push(new Reference_Join(join_property, previous, join_trellis2))

        result.push(new Composite_Join(join_trellis2, join_trellis))
        return join_trellis
      }
      else {
        join_trellis = Join_Trellis_Wrapper.create_using_property(branch.trellis, branch.property)
        result.push(new Reference_Join(join_property, previous, join_trellis))
        return join_trellis
      }

    }

    static tree_to_joins(tree:Join_Tree[], previous:Join_Trellis):IJoin[] {
      var result:IJoin[] = []

      for (var i = 0; i < tree.length; ++i) {
        var branch:Join_Tree = tree[i], cross:Cross_Trellis = null
        var join_trellis = Join.convert(branch, previous, result)
        result = result.concat(Join.tree_to_joins(branch.children, join_trellis))
      }

      return result
    }

    static render_paths(trellis:Trellis, paths:Property[][]):string[] {
      var tree = Join.paths_to_tree(trellis, paths)
      var joins = Join.tree_to_joins(tree, new Join_Trellis_Wrapper(trellis))
      return joins.map((join)=> join.render())
    }

    static path_to_property_chain(base:Trellis, path) {
      var parts = Ground.path_to_array(path)
      var trellis = base
      var result = []

      for (var i = 0; i < parts.length; ++i) {
        var part = parts[i]
        var property = trellis.get_property(part)

        result.push(property)
        trellis = property.other_trellis
      }

      return result
    }

    static get_end_query(property_chain:Property[]):string {
      var last_property = property_chain[property_chain.length - 1]
      var last_reference = Join.get_last_reference(property_chain)
      var table_name = Join.generate_table_name(last_property.parent, last_reference)
      return table_name + '.' + last_property.get_field_name()
    }
  }

  export class Reference_Join implements IJoin {

    property:Join_Property
    first:Join_Trellis
    second:Join_Trellis

    constructor(property:Join_Property, first:Join_Trellis, second:Join_Trellis) {
      this.property = property
      this.first = first
      this.second = second
    }

    render():string {
      return 'LEFT JOIN ' + this.second.get_table_name() + ' ' + this.second.get_alias()
        + ' ON ' + this.get_condition()
    }

    private get_condition() {
      if (this.property.type === 'reference')
        return this.get_query_reference(this.first, this.property) + ' = ' + this.second.query_identity()
      else
        return this.first.query_identity() + ' = ' + this.get_query_reference(this.second, this.property.other_property)
    }

    private get_query_reference(trellis:Join_Trellis, property:Join_Property):string {
      return trellis.get_alias() + '.' + property.field_name
    }
  }

  export class Composite_Join implements IJoin {
    first:Join_Trellis
    second:Join_Trellis

    constructor(first:Join_Trellis, second:Join_Trellis) {
      this.first = first
      this.second = second
    }

    render():string {
      return 'LEFT JOIN ' + this.second.get_table_name() + ' ' + this.second.get_alias()
        + ' ON ' + this.get_condition()
    }

    private get_condition() {
      return this.first.query_identity() + ' = ' + this.second.query_identity()
    }
  }

}