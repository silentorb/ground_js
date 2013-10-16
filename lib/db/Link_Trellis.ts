/**
 * User: Chris Johnson
 * Date: 10/1/13
 */

/// <reference path="../references.ts"/>

module Ground {

  export class Link_Trellis {
    properties:{ [name: string]: Property; } = {}
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

      var conditions = []
      for (var i in this.properties) {
        var property = this.properties[i]
        var condition = Link_Trellis.get_condition(property, seed)
        if (condition)
          conditions.push(condition)
      }

      return 'JOIN ' + this.table_name + ' ON ' + conditions.join(' AND ') + "\n"
    }

    private generate_table_name() {
      var temp = MetaHub.map_to_array(this.properties,
        (p)=>  p.parent.get_plural())
      temp = temp.sort()
      this.table_name = temp.join('_')
    }

    static get_condition(property:Property, seed) {
      if (seed[property.name] !== undefined)
        return property.query() + ' = ' + seed[property.name]
      else
        return null
    }
  }

  export class Link_Trellis2 {
    table_name:string;
    property:Property;
    args;
    first_property:Property;
    second_property:Property;
    id_suffix:string = '';

    constructor(property:Property) {
      this.property = property;
      this.args = this.get_arguments(property);
    }

    generate_join(id, reverse:boolean = false) {
      var sql;
      if (reverse) {
        sql = "JOIN %table_name ON %table_name.%second_key = %forward_id" +
          " AND %table_name.%first_key = " + id + "\n";
      }
      else {
        sql = "JOIN %table_name ON %table_name.%second_key = " + id +
          " AND %table_name.%first_key = %back_id\n";
      }

      return Link_Trellis.populate_sql(sql, this.args);
    }

    generate_delete_row(first_id, second_id) {
      var sql = "DELETE FROM %table_name WHERE %table_name.%first_key = " + first_id +
        " AND %table_name.%second_key = " + second_id + "\n;"
      return Link_Trellis.populate_sql(sql, this.args);
    }

    generate_insert(first_id, second_id) {
      var sql = "REPLACE INTO %table_name (`%first_key`, `%second_key`) VALUES ("
        + first_id + ", " + second_id + ")\n;"
      return Link_Trellis.populate_sql(sql, this.args);
    }

    get_arguments(property) {
      var other_property = property.get_other_property();
      var first_key, second_key;

      // Since we are checking for an ideal cross table name,
      // Use plural trellis names isntead of any table name overrides.
      var other_table = other_property.parent.get_plural();
      var temp = [other_table, property.parent.get_plural()];
      temp = temp.sort();
      this.table_name = temp.join('_');
      var result = {
        '%first_id': property.query(),
        '%second_id': other_property.query(),
        '%back_id': other_property.parent.query_primary_key(),
        '%forward_id': property.parent.query_primary_key()
      }

      var ground = property.parent.ground;
      var table = ground.tables[this.table_name];
      if (table && Object.keys(table.properties).length >= 2) {
        for (var name in table.properties) {
          var field = table.properties[name];
          if (field.trellis === property.trellis)
            first_key = name;
          else if (field.trellis === other_property.other_trellis)
            second_key = name;
        }

        console.log('info', first_key, second_key, table.name, result)
        if (!first_key || !second_key)
          throw new Error('Properties do not line up for cross table: ' + this.table_name + '.');

        MetaHub.extend(result, {
          '%table_name': table.name,
          '%first_key': first_key,
          '%second_key': second_key
        });
      }
      else {
        MetaHub.extend(result, {
          '%table_name': this.table_name,
          '%first_key': property.parent.name + this.id_suffix,
          '%second_key': other_property.parent.name + this.id_suffix
        });
      }

      return result;
    }

    static populate_sql(sql:string, args):string {
      var result = sql;
      for (var a in args) {
        result = result.replace(new RegExp(a, 'g'), args[a]);
      }
      return result;
    }
  }
}