/**
 * User: Chris Johnson
 * Date: 10/1/13
 */

/// <reference path="../references.ts"/>

module Ground {

  export class Link_Trellis {
    properties:{ [name: string]: Property;
    } = {}
    seed
    table_name:string

    constructor(property:Property) {
      this.initialize_property(property)
      this.initialize_property(property.get_other_property())
    }

    initialize_property(property:Property) {
      this.properties[property.name] = property
      if (property.composite_properties) {
        for (var i in property.composite_properties) {
          var prop = property.composite_properties[i]
          this.properties[prop.name] = prop
        }
      }
    }

    generate_join(seed) {
//      var sql = "JOIN %table_name ON %table_name.%second_key = " + id +
//        " AND %table_name.%first_key = %back_id\n";

      return 'JOIN ' + this.table_name + ' ON ' + this.get_condition_string(seed) + "\n"
    }

    generate_delete_row(seed):string {
//      var sql = "DELETE FROM %table_name WHERE %table_name.%first_key = " + first_id +
//        " AND %table_name.%second_key = " + second_id + "\n;"
//      return Link_Trellis2.populate_sql(sql, this.args);
      return 'DELETE ' + this.table_name + ' ON ' + this.get_condition_string(seed) + "\n"
      throw new Error('not implemented')
    }

    generate_insert(first_id, second_id):string {
      var fields =this.get_key_values()

      throw new Error('not implemented')
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

    get_condition_string(seed):string {
      return this.get_conditions(seed).join(' AND ')
    }

//    get_key_values():any {
//      var result = {}
//
//      for (var p in this.properties) {
//        var property = this.properties[p]
//        var trellis = property.other_trellis
//        var primary = trellis.properties[trellis.primary_key]
//        result[trellis.primary_key] = primary
//        if (primary.composite_properties) {
//          for (var c in primary.composite_properties) {
//            result[c] = primary.composite_properties[c]
//          }
//        }
//      }
//
//      return result
//    }

    get_conditions(seed):string[] {
      var conditions = []
      for (var i in this.properties) {
        var property = this.properties[i]
        var condition = Link_Trellis.get_condition(property, seed)
        if (condition)
          conditions.push(condition)
      }

      return conditions
    }


  }

}