/// <reference path="Trellis.ts"/>
/// <reference path="Property.ts"/>

module loader {

  export interface IProperty_Source {
    name?:string
    type:string
    insert?:string
    is_virtual?:boolean
    is_readonly?:boolean
    is_private?:boolean
    other_property?:string
    trellis?:string
    allow_null?:boolean
  }

  export interface ITrellis_Source {
    parent?:string
    interfaces?:string[]
    name?:string
    primary_key?:string
    properties?
    is_virtual?:boolean
  }

  export interface ISchema_Source {
    trellises?
    tables?
    logic?
  }

  export function initialize_property(property:landscape.Property, source:IProperty_Source) {
    for (var i in source) {
      if (property.hasOwnProperty(i))
        property[i] = source[i];
    }

    if (source['default'] !== undefined)
      property.default = source['default']

    if (typeof source['allow_null'] == 'boolean')
      property.allow_null = source['allow_null']

    if (source.trellis) {
      property.other_trellis_name = source.trellis;
    }
  }

  export function load_schema_from_file(schema:landscape.Schema, filename:string) {
    var data = load_json_from_file(filename);
    try {
      parse_schema(schema, data)
    }
    catch (ex) {
      ex.message = "Error parsing " + filename + ": " + ex.message
      throw ex
    }
  }

  function parse_schema(schema:landscape.Schema, data:ISchema_Source) {
    var subset:landscape.Trellis[] = null
    if (data.trellises)
      subset = load_trellises(schema, data.trellises);

    if (data.tables)
      load_tables(schema, data.tables);

    if (subset)
      initialize_trellises(subset, schema.trellises);

    //if (MetaHub.is_array(data.logic) && data.logic.length > 0) {
    //  Logic.load(schema, data.logic)
    //}

    create_remaining_tables(schema)
    create_missing_table_links(schema)
  }

  function initialize_trellises(subset:landscape.Trellis[], all = null) {
    all = all || subset;

    for (var i in subset) {
      var trellis = subset[i];
      trellis.initialize(all)
    }
  }

  function create_remaining_tables(schema:landscape.Schema) {
    for (var i in schema.trellises) {
      var trellis = schema.trellises[i]
      if (schema.tables[trellis.name])
        continue

      var table = Ground.Table.create_from_trellis(trellis, schema.ground)
      schema.tables[i] = table
    }
  }

  function create_missing_table_links(schema:landscape.Schema) {
    for (var i in schema.trellises) {
      var trellis = schema.trellises[i]
      var table = schema.tables[trellis.name]
      var links = trellis.get_all_links()
      for (var p in links) {
        if (!table.links[p])
          table.create_link(links[p])
      }
    }
  }

  function load_tables(schema:landscape.Schema, tables:any[]) {
    for (var name in tables) {
      var table = new Ground.Table(name, schema.ground);
      table.load_from_schema(tables[name]);
      schema.tables[name] = table;
      schema.custom_tables[name] = table;
    }
  }

  function load_trellises(schema:landscape.Schema, trellises:loader.ITrellis_Source[]):landscape.Trellis[] {
    var subset = [];
    for (var name in trellises) {
      var trellis = schema.add_trellis(name, trellises[name], false);
      subset[name] = trellis;
    }

    return subset
  }

  export function load_property_types(schema: landscape.Schema,property_types) {
    //var property_types = Schema.load_json_from_file(filename);
    for (var name in property_types) {
      var info = property_types[name];
      var type = new landscape.Property_Type(name, info, schema.property_types);
      schema.property_types[name] = type;
    }
  }

  export function load_json_from_file(filename:string) {
    var fs = require('fs')
    var json = fs.readFileSync(filename, 'ascii');
    if (!json)
      throw new Error('Could not find file: ' + filename)

    return JSON.parse(json);
  }

}
