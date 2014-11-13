/**
 * User: Chris Johnson
 * Date: 10/2/2014
 */

module Ground {

  export class Field_List implements Internal_Query_Source {

    source:Query_Builder
    properties
    derived_properties
    //all_properties
    fields:any[] = []
    joins:string[] = []
    trellises = {}
    reference_hierarchy:Embedded_Reference[] = []
    all_references:Embedded_Reference[] = []
    reference_join_count = 0

    constructor(source:Query_Builder) {
      this.source = source
      //this.all_properties = source.get_properties()
      this.properties = source.get_field_properties()
      this.derived_properties = Field_List.get_derived_properties(source.trellis)
      var name

      if (source.map && Object.keys(source.map).length > 0) {
        this.map_fields()
      }
      else {
        for (name in this.properties) {
          this.render_field(this.properties[name])
        }
      }

      this.generate_ancestor_joins(source)
    }

    private generate_ancestor_joins(source) {
      var ancestor_joins = []
      for (name in this.trellises) {
        var trellis = this.trellises[name];
        var join = source.trellis.get_ancestor_join(trellis);
        if (join)
          ancestor_joins.push(join);
      }
      this.joins = ancestor_joins.concat(this.joins)
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
      var properties = query.get_field_properties2().concat(Field_List.get_derived_properties(property.other_trellis))
      var reference = new Embedded_Reference(
        property,
        ++this.reference_join_count,
        properties,
        previous
      )
      this.all_references.push(reference)

      for (var i in properties) {
        var prop = properties[i]
        if (prop.type == 'list')
          continue

        var field_sql = reference.render_field(prop)
        if (field_sql)
          this.fields.push(field_sql)
      }

      this.joins.push(reference.render())

      for (var i in properties) {
        var prop = properties[i]
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

    private get_property(name:string) {
      if (this.properties[name])
        return this.properties[name]

      for (var i = 0; i < this.derived_properties.length; ++i) {
        var property = this.derived_properties[i]
        if (property.name == name)
          return property
      }

      return null
    }

    private map_field(name) {
      if (!name.match(/^[\w_]+$/))
        throw new Error('Invalid field name for mapping: ' + name + '.')


      var expression = this.source.map[name]
      if (!expression.type) {
        var property = this.get_property(name)
        if (!property)
          return

        this.render_field(property)
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
        var property = this.get_property(expression.path)
        if (!property)
          return

          //throw new Error('Invalid map path: ' + expression.path + '.')

        var sql = property.query() + " AS " + name
        this.fields.push(sql)
      }
    }

    static get_derived_properties(trellis:Trellis) {
      var result = []
      for (var i = 0; i < trellis.children.length; ++i) {
       var child = trellis.children[i]
        for (var p in child.properties) {
          if (p == child.primary_key)
            continue

          var property = child.properties[p]
          if (property.type != 'list')
            result.push(property)
        }

        result = result.concat(Field_List.get_derived_properties(child))
      }

      return result
    }
  }
}