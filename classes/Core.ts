/**
 * Created with JetBrains PhpStorm.
 * User: Chris Johnson
 * Date: 9/18/13
 */

/// <reference path="require.ts"/>
/// <reference path="references.ts"/>
/// <reference path="db/Database.ts"/>
/// <reference path="Trellis.ts"/>
/// <reference path="../defs/node.d.ts"/>

module Ground {

  export class Property_Type {
    name:string;
    property_class;
    field_type;
    default_value;
    parent:Property_Type;
    db:Database;

    constructor(name:string, info, types:Property_Type[]) {
      if (info.parent) {
        var parent = types[info.parent];
        //MetaHub.extend(this, parent);
        this.parent = parent;
      }
      else {
        this.field_type = info.field_type;
      }

      this.name = name;
      this.property_class = 'Property';
      if (info.default) {
        this.default_value = info.default;
      }
    }

    get_field_type() {
      if (this.field_type) {
        return this.field_type;
      }

      if (this.parent) {
        return this.parent.get_field_type();
      }

      throw new Error(this.name + " could not find valid field type.");
    }
  }

  export class Core {
    trellises:Trellis[] = [];
    tables:Table[] = [];
    views:Array<any> = [];
    property_types:Property_Type[] = [];
    db:Database;
    expansions:any[] = []

    constructor(config, db_name:string) {
//      super();
      this.db = new Database(config, db_name);
      var path = require('path');
      var filename = path.resolve(__dirname, 'property_types.json');
      this.load_property_types(filename);
    }

    add_trellis(name:string, source, initialize_parent = true):Trellis {
      var trellis = new Trellis(name, this);
      if (source)
        trellis.load_from_object(source);

      this.trellises[name] = trellis;

      if (initialize_parent)
        this.initialize_trellises([trellis], this.trellises);

      return trellis;
    }

    initialize_trellises(subset:Trellis[], all = null) {
      all = all || subset;

      for (var i in subset) {
        var trellis = subset[i];
        if (typeof trellis.parent === 'string') {
          trellis.set_parent(all[trellis.parent]);
          trellis.check_primary_key();
        }
      }
    }

    static load_json_from_file(filename:string) {
      var fs = require('fs')
      var json = fs.readFileSync(filename, 'ascii');
      if (!json)
        throw new Error('Could not find file: ' + filename)

      return JSON.parse(json);
    }

    load_property_types(filename:string) {
      var property_types = Core.load_json_from_file(filename);
      for (var name in property_types) {
        var info = property_types[name];
        var type = new Property_Type(name, info, this.property_types);
        this.property_types[name] = type;
      }
    }

    load_schema_from_file(filename:string) {
      var data = Core.load_json_from_file(filename);
      this.parse_schema(data);
    }

    load_tables(tables:Array<any>) {
      for (var name in tables) {
        var table = new Table(name, this);
        table.load_from_schema(tables[name]);
        this.tables[name] = table;
      }
    }

    load_trellises(trellises:Trellis[]) {
      var subset = [];
      for (var name in trellises) {
        var trellis = this.add_trellis(name, trellises[name], false);
        subset[name] = trellis;
      }

      this.initialize_trellises(subset, this.trellises);
    }

    parse_schema(data) {
      if (data.trellises)
        this.load_trellises(data.trellises);

      if (data.views)
        this.views = this.views.concat(data.views);

      if (data.tables)
        this.load_tables(data.tables);
    }

  }
}

module.exports = Ground