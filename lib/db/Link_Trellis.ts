/**
 * User: Chris Johnson
 * Date: 10/1/13
 */

/// <reference path="../references.ts"/>

module Ground {
  export class Link_Trellis {
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

    generate_join(id, reverse:boolean = false){
      var sql;
      if(reverse){
        sql = "JOIN %table_name ON %table_name.%second_key = %forward_id" +
        " AND %table_name.%first_key = " + id + "\n";
      }
      else {
        sql = "JOIN %table_name ON %table_name.%second_key = " + id +
        " AND %table_name.%first_key = %back_id\n";
      }

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

    static populate_sql(sql:string, args):string{
      var result = sql;
      for(var a in args) {
        result = result.replace(new RegExp(a, 'g'), args[a]);
      }
      return result;
    }
  }
}