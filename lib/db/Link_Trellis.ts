/**
 * User: Chris Johnson
 * Date: 10/1/13
 */

/// <reference path="../references.ts"/>

module Ground {

  // Map an entity reference property to a 
  export interface Identity_Reference {
    name: string
    trellis:Trellis
    keys:Identity_Key[]
  }

  export interface Identity_Key {
    name: string
    type: string
    property:Property
  }

  export class Link_Trellis {
    properties
    seed
    table_name:string
    trellises:Trellis[] = []

    constructor(trellises:Trellis[]) {
      this.trellises = trellises
      this.table_name = trellises.map((t)=> t.get_plural())
        .sort().join('_')

      this.properties = trellises.map((x)=> this.create_identity(x))
    }

    create_identity(trellis:Trellis):Identity_Reference {
      var properties = []
      var property = trellis.properties[trellis.primary_key]
      properties.push(Link_Trellis.create_reference(property))

      if (property.composite_properties) {
        for (var i in property.composite_properties) {
          var prop = property.composite_properties[i]
          properties.push(Link_Trellis.create_reference(prop))
        }
      }
      return {
        name: trellis.name,
        trellis: trellis,
        keys: properties
      }
    }

    static create_from_property(property:Property):Link_Trellis {
      var trellises = [
        property.parent,
        property.other_trellis]
      return new Link_Trellis(trellises)
    }

    static create_reference(property:Property):Identity_Key {
      var name = property.name
      return {
        name: name,
        type: property.type,
        property: property
      }
    }

    generate_join(seeds:any[]) {
//      var sql = "JOIN %table_name ON %table_name.%second_key = " + id +
//        " AND %table_name.%first_key = %back_id\n";

      return 'JOIN ' + this.table_name + ' ON ' + this.get_condition_string(seeds) + "\n"
    }

    generate_delete_row(seeds:any[]):string {
//      var sql = "DELETE FROM %table_name WHERE %table_name.%first_key = " + first_id +
//        " AND %table_name.%second_key = " + second_id + "\n;"
//      return Link_Trellis2.populate_sql(sql, this.args);
      return 'DELETE ' + this.table_name + ' ON ' + this.get_condition_string(seeds) + "\n"
    }

    generate_insert(seeds:any[]):string {
      var values = [], keys = []
      console.log('seeds', seeds)
      console.log('properties', this.properties)
      for (var i in this.properties) {
        var list = this.properties[i], seed = seeds[i]
        for (var p in list) {
          var property = list[p], seed = seeds[i], name = property.name
//          if ()
          keys.push(name)
          values.push(property.get_sql_value(seed[name]))
        }
      }
      return 'REPLACE INTO ' + this.table_name + ' (`'
        + keys.join('`, `')
        + '`) VALUES ('
        + values.join(', ')
        + ');\n'

//      var sql = "REPLACE INTO %table_name (`%first_key`, `%second_key`) VALUES ("
//        + first_id + ", " + second_id + ")\n;"
//      return Link_Trellis2.populate_sql(sql, this.args);
    }

    private generate_table_name() {
      var temp = MetaHub.map_to_array(this.properties,
        (p)=>  p.parent.get_plural())
      temp = temp.sort()
      this.table_name = temp.join('_')
    }

    static get_condition(property:Property, seed) {
      if (seed[property.name] !== undefined) {
        var value = seed[property.name]
        if (typeof value === 'function')
          value == value()
        else
          value = property.get_sql_value(value)
        return property.query() + ' = ' + value
      }
      else
        return null
    }

    get_condition_string(seeds:any[]):string {
      return this.get_conditions(seeds).join(' AND ')
    }

    get_conditions(seeds:any[]):string[] {
      var conditions = []
      for (var i in this.properties) {
        var list = this.properties[i], seed = seeds[i]
        for (var p in list) {
          var property = list[p]
          var condition = Link_Trellis.get_condition(property, seed)
          if (condition)
            conditions.push(condition)
        }
      }

      return conditions
    }

    /*
     Went to all this work and now I'm not sure it's necessary for many-to-many connections

     // Very important function.  Determines the primary key values of
     // the referenced seed based on a referring seed.  Uses two different
     // possible methods to determine this.

     // property_index can be either zero or one.
     // It determines whether the provided seed belongs
     // to the first or second trellis of this cross table
     get_other_seed(seed, property_index = 0) {
     if (property_index !== 0 && property_index !== 1)
     throw new Error('get_other_seed()\'s property_index can only be 0 or 1.')

     var result = {}, i, other_property
     var property = this.properties[property_index]
     var other_property_list = this.properties[1 - property_index]
     var other_trellis = property.other_trellis
     var reference_value = seed[property.name]

     // First consider explicit composite reference properties.
     // This is done first so they can be overriden by the reference object.
     for (i = 0; i < other_property_list.length; ++i) {
     other_property = other_property_list[i]
     var reference_name = other_trellis.name + '_' + other_property.name
     if (seed[reference_name] !== undefined)
     result[other_property.name] = seed[reference_name]
     }

     // Next consider the referenced value
     if (typeof reference_value === 'object') {
     for (i = 0; i < other_property_list.length; ++i) {
     other_property = other_property_list[i]
     if (reference_value[other_property.name] !== undefined)
     result[other_property.name] = reference_value[other_property.name]
     }
     }
     else {
     result[other_trellis.primary_key] = reference_value
     }

     for (i = 0; i < other_property_list.length; ++i) {
     other_property = other_property_list[i]
     if (result[other_property.name] === undefined)
     throw new Error('Link reference seed for ' + property.parent.name + ' has incomplete reference to ' + other_trellis.name + '.')
     }
     return result
     }
     */
  }

}