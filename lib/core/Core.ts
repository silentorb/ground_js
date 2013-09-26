/**
 * Created with JetBrains PhpStorm.
 * User: Chris Johnson
 * Date: 9/18/13
 */

/// <reference path="require.ts"/>
/// <reference path="../references.ts"/>
/// <reference path="../db/Database.ts"/>
/// <reference path="../schema/Trellis.ts"/>
/// <reference path="../operations/Query.ts"/>
/// <reference path="../operations/Update.ts"/>
/// <reference path="../operations/Delete.ts"/>
/// <reference path="../../defs/node.d.ts"/>
//var MetaHub = require('metahub');

module Ground {

  export interface IProperty_Source {
    name:string;
    type:string;
    property:string;
    is_virtual:boolean;
    trellis:string;
  }

  export interface ITrellis_Source {
    plural:string;
    parent:string;
    name:string;
    primary_key:string;
    properties:IProperty_Source[];
    is_virtual:boolean;
  }

  export interface ISeed {
    _deleted?;
  }

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
        MetaHub.extend(this, parent);
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

  export class Core extends MetaHub.Meta_Object{
    trellises:Trellis[] = [];
    tables:Table[] = [];
    views:Array<any> = [];
    property_types:Property_Type[] = [];
    db:Database;
    expansions:any[] = []

    constructor(config, db_name:string) {
      super();
      this.db = new Database(config, db_name);
      var path = require('path');
      var filename = path.resolve(__dirname, 'property_types.json');
      this.load_property_types(filename);
    }

    add_trellis(name:string, source:ITrellis_Source, initialize_parent = true):Trellis {
      var trellis = new Trellis(name, this);
      if (source)
        trellis.load_from_object(source);

      this.trellises[name] = trellis;

      if (initialize_parent)
        this.initialize_trellises([trellis], this.trellises);

      return trellis;
    }

    delete_object(trellis:Trellis, seed:ISeed):Promise {
      var trellis = this.sanitize_trellis_argument(trellis);
      var del = new Delete();
      return del.run(trellis, seed);
    }

    initialize_trellises(subset:Trellis[], all = null) {
      all = all || subset;

      for (var i in subset) {
        var trellis = subset[i];
        if (typeof trellis.parent === 'string') {
          trellis.set_parent(all[trellis.parent]);
          trellis.check_primary_key();
          for (var j in trellis.properties) {
            var property = trellis.properties[j];
            if (property.other_trellis_name)
              property.other_trellis = this.trellises[property.other_trellis_name];
          }
        }
      }
    }

    insert_object(trellis, seed:ISeed = {}):Promise {
      return this.update_object(trellis, seed);
    }

    static is_private(property:Property):boolean {
      return property.is_private;
    }

    static is_private_or_readonly(property:Property):boolean {
      return property.is_private || property.is_readonly;
    }

    update_object(trellis, seed:ISeed = {}, as_service = false):Promise {
      var trellis = this.sanitize_trellis_argument(trellis);

      // If _deleted is an object then it is a list of links
      // to delete which will be handled by Update.
      // If _delete is simply true then the seed itself is marked for deletion.
      if (seed._deleted === true || seed._deleted === 'true')
        return this.delete_object(trellis, seed);

      this.invoke(trellis.name + '.update', seed, trellis);
      var update = new Update(trellis, seed, this);
      update.is_service = as_service;
      return update.run();
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

    load_trellises(trellises:ITrellis_Source[]) {
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

    static remove_fields(object, trellis:Trellis, filter) {
      for (var key in object) {
        var property = trellis.properties[key];
        if (property && filter(property))
          delete object[key];
      }
      return object;
    }

    private sanitize_trellis_argument(trellis) {
      if (!trellis)
        throw new Error('Trellis is empty');

      if (typeof trellis === 'string') {
        if (!this.trellises[trellis])
          throw new Error('Could not find trellis named: ' + trellis + '.');

        return this.trellises[trellis];
      }

      return trellis;
    }
  }
}

module.exports = Ground