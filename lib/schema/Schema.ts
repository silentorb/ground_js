/// <reference path="../../defs/node.d.ts"/>
/// <reference path="../../../vineyard-metahub/metahub.d.ts"/>
/// <reference path="Property_Type.ts"/>
/// <reference path="Property.ts"/>
/// <reference path="Trellis.ts"/>
/// <reference path="Table.ts"/>

var when = require('when')

module Ground {

  export interface ISchema_Source {
    trellises?
    tables?
    views?
    logic?
  }

  export class Schema {
    property_types:Property_Type[] = []
    trellises:{ [key: string]: Trellis} = {}
    views:any[] = []
    custom_tables:Table[] = []
    tables:Table[] = []

    get_base_property_type(type) {
      var property_type = this.property_types[type];
      if (property_type.parent)
        return this.get_base_property_type(property_type.parent.name)

      return property_type
    }

    convert_value(value, type) {
      if (value === undefined || value === null || value === false) {
        if (type == 'bool')
          return false;

        return null;
      }

      var property_type = this.property_types[type];

      if (property_type && property_type.parent)
        return this.convert_value(value, property_type.parent.name);

      switch (type) {
        case 'date':
        case 'time':
        case 'datetime2':
        case 'guid':
          return value
        case 'list':
        case 'reference':
          return value;
        case 'number': // Just for formatting values on the fly using typeof
        case 'int':
          return Math.round(value);
        case 'string':
        case 'text':
          return value;
        case 'boolean': // Just for formatting values on the fly using typeof
        case 'bool':
          return Schema.to_bool(value);
        case 'float':
        case 'double':
        case 'money':
          return parseFloat(value.toString());
        case 'json':
          var bin = new Buffer(value, 'binary').toString()
          var json = new Buffer(bin, 'base64').toString('ascii');
          return JSON.parse(json);
      }

      throw new Error('Not sure how to convert sql type of ' + type + '.')
//      return null;
    }

    static to_bool(input) {
      if (typeof input == 'string') {
        return input.toLowerCase() == 'true';
      }

      return !!input;
    }

    load_property_types(filename:string) {
      var property_types = Schema.load_json_from_file(filename);
      for (var name in property_types) {
        var info = property_types[name];
        var type = new Property_Type(name, info, this.property_types);
        this.property_types[name] = type;
      }
    }

    static load_json_from_file(filename:string) {
      var fs = require('fs')
      var json = fs.readFileSync(filename, 'ascii');
      if (!json)
        throw new Error('Could not find file: ' + filename)

      return JSON.parse(json);
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


    get_trellis(trellis):Trellis {
      if (!trellis)
        throw new Error('Trellis argument is empty');

      if (typeof trellis === 'string') {
        if (!this.trellises[trellis])
          throw new Error('Could not find trellis named: ' + trellis + '.');

        return this.trellises[trellis];
      }

      return trellis;
    }

    parse_schema(data:ISchema_Source, ground) {
      var subset:Trellis[] = null
      if (data.trellises)
        subset = this.load_trellises(data.trellises);

      if (data.views)
        this.views = this.views.concat(data.views);

      if (data.tables)
        ground.load_tables(data.tables);

      if (subset)
        this.initialize_trellises(subset, this.trellises);
    }

    initialize_trellises(subset:Trellis[], all = null) {
      all = all || subset;

      for (var i in subset) {
        var trellis = subset[i];
        trellis.initialize(all)
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

    harden_schema() {
      for (var i in this.trellises) {
        this.trellises[i].harden()
      }
    }

  }
}

module.exports = Ground.Schema