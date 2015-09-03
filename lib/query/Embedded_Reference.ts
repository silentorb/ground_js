module Ground {
  export class Embedded_Reference {
    property:landscape.Property
    properties:landscape.Property[] = []
    tables = {}
    children:Embedded_Reference[] = []

    constructor(property:landscape.Property, id:number, properties:landscape.Property[], previous:Join_Trellis = undefined) {
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

    get_field_name(property:landscape.Property):string {
      var table = this.get_table(property)
      return table.second.get_alias() + '_' + property.name
    }

    private get_table(property:landscape.Property):Reference_Join {
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

    render_field(property:landscape.Property):string {
      var table = this.get_table(property)
      if (!table)
        console.log('prop', property.fullname())
      var table_name = table.second.get_alias()
      if (property.is_virtual)
        return property.query_virtual_field(table_name, this.get_field_name(property))

      return property.get_field_query2(
        table_name + '.' + property.get_field_name(),
        this.get_field_name(property)
      )
    }

    render_dummy_field(property:landscape.Property):string {
      return 'NULL AS ' + this.get_field_name(property)
    }

    cleanup_empty(source) {
      for (var p in this.properties) {
        var property = this.properties[p]
        var field_name = this.get_field_name(property)
        if (source[field_name] === undefined)
          continue

        delete source[field_name]
      }

      for (var i = 0; i < this.children.length; ++i) {
        this.children[i].cleanup_empty(source)
      }
    }

    cleanup_entity(source, target) {
      var primary_key = source[this.property.name]

      if (primary_key === null || primary_key === undefined) {
        var table = this.tables[this.property.other_trellis.name]
        var key = table.second.get_alias() + '_' + this.property.other_trellis.primary_key
        primary_key = source[key]
      }

      if (primary_key === null || primary_key === undefined) {
        this.cleanup_empty(source)
        source[this.property.name] = null
        return
      }

      var child_entity = target[this.property.name] = {}
      for (var p in this.properties) {
        var property = this.properties[p]
        var field_name = this.get_field_name(property)
        if (source[field_name] === undefined)
          continue

        child_entity[property.name] = property.parent.ground.convert_value(source[field_name], property.type)
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
}