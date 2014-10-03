/**
 * User: Chris Johnson
 * Date: 10/2/2014
 */

module Ground {

  export class Embedded_Reference {
    property:Property
    properties = []
    tables = {}
    children:Embedded_Reference[] = []

    constructor(property:Property, id:number, properties, previous:Join_Trellis = undefined) {
      if (!previous)
        previous = new Join_Trellis_Wrapper(property.parent)

      this.property = property
      var trellises = {}
      for (var i in properties) {
        var prop = properties[i]
        trellises[prop.parent.name] = prop.parent
      }

      for (var i in trellises) {
        var trellis = trellises[i]
        this.tables[i] = new Reference_Join(
          Join_Property.create_from_property(property),
          previous,
          new Join_Trellis_Wrapper(trellis, trellis.get_table_name() + '_' + id)
        )
      }

      this.properties = properties
    }

    get_field_name(property:Property):string {
      var table = this.get_table(property)
      return table.second.get_alias() + '_' + property.name
    }

    private get_table(property:Property):Reference_Join {
      return this.tables[property.parent.name]
    }

    //render_join():string {
    //  return 'JOIN ' + this.trellis.get_table_query() + ' ' + this.alias
    //    + ' ON ' + this.property.query() + ' = ' + this.alias + '.' + this.trellis.get_primary_keys()[0].get_field_name()
    //}

    render():string {
      var joins = []
      for (var i in this.tables) {
        joins.push(this.tables[i].render())
      }

      return joins.join("\n")
    }

    render_field(property:Property):string {
      var table = this.get_table(property)
      var table_name = table.second.get_alias()
      if (property.is_virtual)
        return property.query_virtual_field(table_name)

      return table_name + '.' + property.get_field_name() + ' AS ' + this.get_field_name(property)
    }

    render_dummy_field(property:Property):string {
      return 'NULL AS ' + this.get_field_name(property)
    }

    cleanup_entity(source, target) {
      var primary_key = source[this.property.name]
      if (primary_key === null || primary_key === undefined)
        return

      var child_entity = target[this.property.name] = {}
      for (var p in this.properties) {
        var property = this.properties[p]
        var field_name = this.get_field_name(property)
        if (source[field_name] === undefined)
          continue

        child_entity[property.name] = source[field_name]
        delete source[field_name]
      }

      for (var i = 0; i < this.children.length; ++i) {
        this.children[i].cleanup_entity(source, child_entity)
      }
    }

    static has_reference(list:Embedded_Reference[], reference:Embedded_Reference) {
      for (var i = 0; i < list.length; ++i) {
        if (list[i].property == reference.property)
          return true
      }

      return false
    }
  }

  export class Field_List implements Internal_Query_Source {

    source:Query_Builder
    properties
    fields:any[] = []
    joins:string[] = []
    trellises = {}
    reference_hierarchy:Embedded_Reference[] = []
    all_references:Embedded_Reference[] = []
    reference_join_count = 0

    constructor(source:Query_Builder) {
      this.source = source
      this.properties = source.get_field_properties()
      var name

      if (source.map && Object.keys(source.map).length > 0) {
        this.map_fields()
      }
      else {
        for (name in this.properties) {
          this.render_field(this.properties[name])
        }
      }

      for (name in this.trellises) {
        var trellis = this.trellises[name];
        var join = source.trellis.get_ancestor_join(trellis);
        if (join)
          this.joins.push(join);
      }
    }

    private render_field(property:Property) {
      var sql = property.is_virtual
        ? property.query_virtual_field()
        : property.get_field_query()

      this.fields.push(sql);

      if (property.parent.name != this.source.trellis.name)
        this.trellises[property.parent.name] = property.parent

      var subquery = this.source.subqueries[property.name]
      if (property.type == 'reference' && subquery) {
        var reference = this.render_reference_fields(property, subquery)
        this.reference_hierarchy.push(reference)
      }
    }

    private render_reference_fields(property:Property, query:Query_Builder, previous:Join_Trellis = undefined):Embedded_Reference {
      var reference = new Embedded_Reference(
        property,
        ++this.reference_join_count,
        query.get_field_properties(),
        previous
      )
      this.all_references.push(reference)

      for (var i in reference.properties) {
        var prop = reference.properties[i]
        if (prop.type == 'list')
          continue

        var field_sql = reference.render_field(prop)
        if (field_sql)
          this.fields.push(field_sql)
      }

      this.joins.push(reference.render())

      for (var i in reference.properties) {
        var prop = reference.properties[i]
        if (prop.type == 'reference' && query.subqueries[prop.name]) {
          var child = this.render_reference_fields(prop, query.subqueries[prop.name], reference.tables[prop.parent.name].second)
          reference.children.push(child)
        }
      }

      return reference
    }

    private map_fields() {
      var source = this.source
      if (!source.map[source.trellis.primary_key])
        this.render_field(source.trellis.get_primary_keys()[0])

      for (name in source.map) {
        this.map_field(name)
      }
    }

    private map_field(name) {
      if (!name.match(/^[\w_]+$/))
        throw new Error('Invalid field name for mapping: ' + name + '.')

      var expression = this.source.map[name]
      if (!expression.type) {
        this.render_field(this.properties[name])
      }
      else if (expression.type == 'literal') {
        var value = expression.value
        if (value === null) {
          value = 'NULL'
        }
        else if (!expression.value.toString().match(/^[\w_]*$/))
          throw new Error('Invalid mapping value: ' + value + '.')

        if (typeof value === 'object') {
          value = "'object'"
        }
        else {
          value = this.source.ground.convert_value(expression.value, typeof expression.value)
          if (typeof value === 'string')
            value = "'" + value + "'"
        }

        var sql = value + " AS " + name
        this.fields.push(sql)
      }
      else if (expression.type == 'reference') {
        if (!this.properties[expression.path])
          throw new Error('Invalid map path: ' + expression.path + '.')

        var sql = this.properties[expression.path].query() + " AS " + name
        this.fields.push(sql)
      }
    }
  }
}