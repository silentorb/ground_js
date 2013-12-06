/**
 * Created with JetBrains PhpStorm.
 * User: Chris Johnson
 * Date: 9/18/13
 */

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
    name?:string;
    type:string;
    insert?:string;
    is_virtual?:boolean;
    is_readonly?:boolean;
    is_private?:boolean;
    property?:string;
    trellis?:string;
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

  export interface IUpdate {
    run:()=>Promise
    get_access_name():string
  }

  interface ISchema_Source {
    trellises?:any[];
    tables?:any[];
    views?:any[];
  }

  export function path_to_array(path) {
    if (MetaHub.is_array(path))
      return path

    path = path.trim()

    if (!path)
      throw new Error('Empty query path.')

    return path.split('/')
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

  export class Core extends MetaHub.Meta_Object {
    trellises:Trellis[] = []
    tables:Table[] = []
    views:any[] = []
    property_types:Property_Type[] = []
    db:Database
    log_queries:boolean = false
    log_updates:boolean = false

    constructor(config, db_name:string) {
      super();
      this.db = new Database(config, db_name);
      var path = require('path');
      var filename = path.resolve(__dirname, 'property_types.json');
      this.load_property_types(filename);
    }

    add_trellis(name:string, source:ITrellis_Source, initialize_parent = true):Trellis {
      var trellis = this.trellises[name]

      if (trellis) {
        trellis = this.trellises[name]
        if (source)
          trellis.load_from_object(source)

        return trellis
      }

      trellis = new Trellis(name, this);
      if (source)
        trellis.load_from_object(source);

      this.trellises[name] = trellis;

      if (initialize_parent)
        this.initialize_trellises([trellis], this.trellises);

      return trellis;
    }

    get_base_property_type(type) {
      var property_type = this.property_types[type];
      if (property_type.parent)
        return this.get_base_property_type(property_type.parent.name)

      return property_type
    }

    convert_value(value, type) {
      if (!value) {
        if (type == 'bool')
          return false;

        return null;
      }

      var property_type = this.property_types[type];

      if (property_type && property_type.parent)
        return this.convert_value(value, property_type.parent.name);

      switch (type) {
        case 'guid':
          return value
        case 'list':
        case 'reference':
          return value;
        case 'int':
          return Math.round(value);
        case 'string':
        case 'text':
          return value;
        case 'bool':
          return Core.to_bool(value);
        case 'float':
        case 'double':
        case 'money':
          return parseFloat(value.toString());
      }

      throw new Error('Not sure how to convert sql type of ' + type + '.')
//      return null;
    }

//    create_query(trellis:Trellis, base_path = '') {
//      return new Query(trellis, base_path);
//    }

    create_query(trellis_name:string, base_path = ''):Query {
      var trellis = this.sanitize_trellis_argument(trellis_name);

      return new Query(trellis, base_path);
    }

    create_update(trellis, seed:ISeed = {}, user:IUser = null):IUpdate {
      var trellis = this.sanitize_trellis_argument(trellis)

      // If _deleted is an object then it is a list of links
      // to delete which will be handled by Update.
      // If _delete is simply true then the seed itself is marked for deletion.
      if (seed._deleted === true || seed._deleted === 'true')
        return new Delete(trellis, seed)

      var update = new Update(trellis, seed, this)
      update.user = user
      update.log_queries = this.log_updates
      return update
    }

    delete_object(trellis:Trellis, seed:ISeed):Promise {
      var trellis = this.sanitize_trellis_argument(trellis)
      var del = new Delete(trellis, seed)
      return del.run()
    }

    initialize_trellises(subset:Trellis[], all = null) {
      all = all || subset;

      for (var i in subset) {
        var trellis = subset[i];
        trellis.initialize(all)
      }
    }

    insert_object(trellis, seed:ISeed = {}, user:IUser = null, as_service = false):Promise {
      return this.update_object(trellis, seed, user, as_service);
    }

    static is_private(property:Property):boolean {
      return property.is_private;
    }

    static is_private_or_readonly(property:Property):boolean {
      return property.is_private || property.is_readonly;
    }

    update_object(trellis, seed:ISeed = {}, user:IUser = null, as_service:boolean = false):Promise {
      var trellis = this.sanitize_trellis_argument(trellis);

      // If _deleted is an object then it is a list of links
      // to delete which will be handled by Update.
      // If _delete is simply true then the seed itself is marked for deletion.
      if (seed._deleted === true || seed._deleted === 'true')
        return this.delete_object(trellis, seed);

      this.invoke(trellis.name + '.update', seed, trellis);
      var update = new Update(trellis, seed, this);
      update.user = user
      update.log_queries = this.log_updates
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

    load_tables(tables:any[]) {
//      console.log('tables', tables)
      for (var name in tables) {
        var table_name;
//        var trellis = this.trellises[name];
//        if (trellis)
//          table_name = trellis.get_table_name();
//        else
//          table_name = name;
        var table = new Table(name, this);
        table.load_from_schema(tables[name]);
        this.tables[name] = table;
      }
    }

    load_trellises(trellises:ITrellis_Source[]):Trellis[] {
      var subset = [];
      for (var name in trellises) {
        var trellis = this.add_trellis(name, trellises[name], false);
        subset[name] = trellis;
      }

      return subset
    }

    private parse_schema(data:ISchema_Source) {
      var subset = null
      if (data.trellises)
        subset = this.load_trellises(data.trellises);

      if (data.views)
        this.views = this.views.concat(data.views);

      if (data.tables)
        this.load_tables(data.tables);

      if (subset)
        this.initialize_trellises(subset, this.trellises);
    }

    static remove_fields(object, trellis:Trellis, filter) {
      for (var key in object) {
        var property = trellis.properties[key];
        if (property && filter(property))
          delete object[key];
      }
      return object;
    }

    sanitize_trellis_argument(trellis):Trellis {
      if (!trellis)
        throw new Error('Trellis is empty');

      if (typeof trellis === 'string') {
        if (!this.trellises[trellis])
          throw new Error('Could not find trellis named: ' + trellis + '.');

        return this.trellises[trellis];
      }

      return trellis;
    }

    static to_bool(input) {
      if (typeof input == 'string') {
        return input.toLowerCase() == 'true';
      }

      return !!input;
    }
  }
}

module.
  exports = Ground