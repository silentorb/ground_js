/// <reference path="../references.ts"/>
/// <reference path="../db/Database.ts"/>
/// <reference path="../landscape/Trellis.ts"/>
/// <reference path="../query/Query.ts"/>
/// <reference path="../operations/Update.ts"/>
/// <reference path="../operations/Delete.ts"/>
/// <reference path="../../defs/node.d.ts"/>
/// <reference path="../landscape/Schema.ts"/>

module Ground {
  export class InputError {
    name = "InputError"
    message
    stack
    status = 400
    details
    key

    constructor(message:string, key = undefined) {
      this.message = message
      this.key = key
    }
  }

  export interface ISeed {
    _deleted?
    _deleted_?
    _removed_?
    __deleted__?
    __removed__?
  }

  export interface IUpdate {
    run:()=>Promise
    get_access_name():string
  }

  export function path_to_array(path) {
    if (MetaHub.is_array(path))
      return path

    path = path.trim()

    if (!path)
      throw new Error('Empty query path.')

    return path.split(/[\/\.]/)
  }

  export class Core extends MetaHub.Meta_Object {
    trellises:{ [key: string]: landscape.Trellis} = {}
    custom_tables:Table[] = []
    tables:Table[] = []
    property_types:landscape.Property_Type[] = []
    db:Database
    log_queries:boolean = false
    log_updates:boolean = false
    schema:landscape.Schema
    query_schema
    update_schema

    constructor(config, db_name:string) {
      super();

      this.schema = new landscape.Schema()
      this.schema.ground = this
      this.property_types = this.schema.property_types
      this.trellises = this.schema.trellises
      this.tables = this.schema.tables
      this.custom_tables = this.schema.custom_tables

      this.query_schema = Core.load_relative_json_file('validation/query.json')
      this.update_schema = Core.load_relative_json_file('validation/update.json')
      this.db = new Database(config, db_name);
    }

    private static load_relative_json_file(path) {
      var Path = require('path');
      var fs = require('fs')
      return JSON.parse(fs.readFileSync(Path.resolve(__dirname, path), 'ascii'))
    }

    add_trellis(name:string, source:loader.ITrellis_Source, initialize_parent = true):landscape.Trellis {
      return this.schema.add_trellis(name, source, initialize_parent)
    }

    get_base_property_type(type) {
      return this.schema.get_base_property_type(type)
    }

    get_identity(trellis:string, seed) {
      return this.get_trellis(trellis).get_identity2(seed)
    }

    get_trellis(trellis):landscape.Trellis {
      return this.schema.get_trellis(trellis)
    }

    convert_value(value, type) {
      return this.schema.convert_value(value, type)
    }

    create_query(trellis_name:string, base_path = ''):Query_Builder {
      var trellis = this.sanitize_trellis_argument(trellis_name);

      return new Query_Builder(trellis);
    }

    create_update(trellis, seed:ISeed = {}, user:IUser = null):IUpdate {
      trellis = this.sanitize_trellis_argument(trellis)

      // If _deleted is an object then it is a list of links
      // to delete which will be handled by Update.
      // If _delete is simply true then the seed itself is marked for deletion.
      if (seed._deleted === true
        || seed._deleted === 'true'
        || seed._deleted_ === true
        || seed._deleted_ === 'true'
        || seed.__deleted__ === true
        || seed.__deleted__ === 1)
        return new Delete(this, trellis, seed)

      var update = new Update(trellis, seed, this)
      update.user = user
      update.log_queries = this.log_updates
      return update
    }

    delete_object(trellis:landscape.Trellis, seed:ISeed):Promise {
      var trellis = this.sanitize_trellis_argument(trellis)
      var del = new Delete(this, trellis, seed)
      return del.run()
    }

    insert_object(trellis, seed:ISeed = {}, user:IUser = null, as_service = false):Promise {
      return this.update_object(trellis, seed, user, as_service);
    }

    static is_private(property:landscape.Property):boolean {
      return property.is_private;
    }

    static is_private_or_readonly(property:landscape.Property):boolean {
      return property.is_private || property.is_readonly;
    }

    update_object(trellis, seed:ISeed = {}, user:IUser = null, as_service:boolean = false):Promise {
      trellis = this.sanitize_trellis_argument(trellis);

      // If _deleted is an object then it is a list of links
      // to delete which will be handled by Update.
      // If _delete is simply true then the seed itself is marked for deletion.
      if (seed._deleted === true || seed._deleted === 'true'
        || seed._deleted_ === true || seed._deleted_ === 'true'
        || seed.__deleted__ === true || seed.__deleted__ === 1
      )
        return this.delete_object(trellis, seed);

      var update = new Update(trellis, seed, this);
      update.user = user
      update.log_queries = this.log_updates
//      this.invoke(trellis.name + '.update', seed, trellis);
      return update.run();
    }

    static load_json_from_file(filename:string) {
      var fs = require('fs')
      var json = fs.readFileSync(filename, 'ascii');
      if (!json)
        throw new Error('Could not find file: ' + filename)

      return JSON.parse(json);
    }

    load_schema_from_file(filename:string) {
      loader.load_schema_from_file(this.schema, filename)
    }

    static remove_fields(object, trellis:landscape.Trellis, filter) {
      for (var key in object) {
        var property = trellis.properties[key];
        if (property && filter(property))
          delete object[key];
      }
      return object;
    }

    // Deprecated in favor of get_trellis()
    sanitize_trellis_argument(trellis):landscape.Trellis {
      return this.get_trellis(trellis)
    }

    stop() {
      this.db.close()
    }

    static to_bool(input) {
      if (typeof input == 'string') {
        return input.toLowerCase() == 'true';
      }

      return !!input;
    }

    export_schema() {
      return {
        objects: MetaHub.map_to_array(this.trellises, (trellis) => trellis.export_schema())
      }
    }

    static perspective(seed, trellis:landscape.Trellis, property:landscape.Property) {
      if (trellis === property.parent) {
        return seed
      }
      else {
        var result = {}
        var other_property = property.get_other_property()

        var identity = seed[other_property.name]
        var reference = seed[other_property.parent.primary_key]

        if (other_property.type == 'list') {
          result[property.parent.primary_key] = identity[0]
          result[other_property.name] = [reference]
        }
        else {
          result[property.parent.primary_key] = identity
          result[other_property.name] = reference
        }

        return result
      }
    }

    harden_schema() {
      for (var i in this.trellises) {
        this.trellises[i].harden()
      }
    }

  }
}

module.exports = Ground