/**
 * User: Chris Johnson
 * Date: 9/19/13
 */
/// <reference path="../references.ts"/>
/// <reference path="../../../metahub/metahub.ts"/>

module Ground {
  export class Table {
    name:string;
    properties:Array<any> = [];
    indexes:Array<any>;
    ground:Core;
    db_name:string;
    trellis:Trellis;
    primary_keys:any[];

    constructor(name:string, ground:Core) {
      this.name = name;
      this.ground = ground;
    }

    connect_trellis(trellis:Trellis) {
      this.trellis = trellis;
      trellis.table = this;
    }


    static create_from_trellis(trellis:Trellis, ground:Core = null) {
      if (trellis.table)
        return trellis.table;

      ground = ground || trellis.ground;

      var table = new Table(trellis.get_table_name(), ground);
      table.connect_trellis(trellis);
      return table;
    }

    static  create_sql_from_array(table_name:string, source:any[], primary_keys = [], indexes = []):string {
      var fields = MetaHub.map_to_array(source, (field, index)=> {
        var name = field.name || index;
        var type = field.type;

        if (!type)
          throw new Error('Field ' + name + 'is missing a type.');

        var field_sql = '`' + name + '` ' + type;
        if (primary_keys.indexOf(name) > -1) {
          if (type.search(/INT/) > -1 && primary_keys[0] == name)
            field_sql += ' AUTO_INCREMENT';
        }
        if (field.default !== undefined)
          field_sql += ' DEFAULT ' + Table.format_value(field.default);

        return field_sql;
      });

      // Currently can't create a table without fields.  Seems reasonable enough.
      if (fields.length == 0) {
        if (source.length > 0)
          throw new Error('None of the field arguments for creating ' + table_name + ' have a type.');
        else
          throw new Error('Cannot creat a table without fields: ' + table_name + '.');
      }

      var primary_fields = MetaHub.map_to_array(primary_keys, (key) => '`' + key + '`');
      fields.push('PRIMARY KEY (' + primary_fields.join(', ') + ")\n");
      fields = fields.concat(MetaHub.map_to_array(indexes,
        (index, key) => Table.generate_index_sql(key, index)));
      var sql = 'CREATE TABLE IF NOT EXISTS `' + table_name + "` (\n";
      sql += fields.join(",\n") + "\n";
      sql += ");\n";
      return sql;
    }

    create_sql_from_trellis(trellis:Trellis):string {
      var primary_keys;
      if (!trellis) {
        if (!this.trellis)
          throw new Error('No valid trellis to generate sql from.');

        trellis = this.trellis;
      }

      var core_properties = trellis.get_core_properties();
      if (Object.keys(core_properties).length === 0)
        throw new Error('Cannot create a table for ' + trellis.name + '. It does not have any core properties.');

      var fields = [];
      for (var name in core_properties) {
        var property = core_properties[name];
        var field_test = this.properties[property.name];

        // Don't duplicate shared fields.
        if (field_test && field_test.share)
          continue;

        var field = {
          name: property.get_field_name(),
          type: property.get_field_type(),
          default: undefined
        };

        if (property.default !== undefined)
          field.default = property.default;

        fields.push(field);
      }

      if (this.primary_keys && this.primary_keys.length > 0) {
        primary_keys = MetaHub.map(this.primary_keys, (name) => {
          if (!trellis.properties[name])
            throw new Error('Error creating ' + trellis.name + '; it does not have a primary key named ' + name + '.');

          return trellis.properties[name].get_field_name();
        });
      }
      else {
        primary_keys = [ trellis.properties[trellis.primary_key].get_field_name() ];
      }

      return Table.create_sql_from_array(this.name, fields, primary_keys, this.indexes);
    }

    static format_value(value) {
      if (typeof value === 'string')
        return "'" + value + "'";

      if (value === null)
        return 'NULL';

      if (value === true)
        return 'TRUE';

      if (value === false)
        return 'FALSE';

      return value;
    }

    static generate_index_sql(name:string, index) {
      var name_string, index_fields = index.fields.join('`, `');
      var result = '';

      if (index.unique) {
        result += 'UNIQUE ';
        name_string = '';
      }
      else {
        name_string = '`' + name + '`';
      }

      result += "KEY " + name_string + ' (`' + index_fields + "`)\n";
      return result;
    }

    load_from_schema(source) {
      MetaHub.extend(this, source);
      if (this.ground.trellises[this.name]) {
        this.trellis = this.ground.trellises[this.name];
        this.trellis.table = this;
      }
    }
  }
}