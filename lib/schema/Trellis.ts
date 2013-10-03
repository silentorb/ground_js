/**
 * Created with JetBrains PhpStorm.
 * User: Chris Johnson
 * Date: 9/18/13
 */

/// <reference path="../references.ts"/>

module Ground {
  export class Trellis {
    plural:string = null;
    parent:Trellis = null;
    ground:Core;
    table:Table = null;
    name:string = null;
    primary_key:string = 'id';
    // Property that are specific to this trellis and not inherited from a parent trellis
    properties:{ [name: string]: Property } = {};
    // Every property including inherited properties
    all_properties:{ [name: string]: Property; } = {};
    is_virtual:boolean = false;

    constructor(name:string, ground:Core) {
      this.ground = ground;
      this.name = name;
    }

    add_property(name:string, source):Property {
      var property = new Property(name, source, this);
      this.properties[name] = property;
      this.all_properties[name] = property;
      return property;
    }

    check_primary_key() {
      if (!this.properties[this.primary_key] && this.parent) {
        var property = this.parent.properties[this.parent.primary_key];
        this.properties[this.primary_key] = new Property(this.primary_key, property.get_data(), this);
      }
    }

    clone_property(property_name:string, target_trellis:Trellis) {
      if (this.properties[property_name] === undefined)
        throw new Error(this.name + ' does not have a property named ' + property_name + '.');

      target_trellis.add_property(property_name, this.properties[property_name]);
    }

    get_all_links(filter:(property:Property)=>boolean = null):{ [name: string]: Property; } {
      var result = {};
      var properties = this.get_all_properties();
      for (var name in properties) {
        var property = properties[name];
        if (property.other_trellis && (!filter || filter(property)))
          result[property.name] = property;
      }

      return result;
    }

    get_all_properties():{ [name: string]: Property; } {
      var result = {}
      var tree = this.get_tree();
      for (var i = 0; i < tree.length; ++i) {
        var trellis = tree[i];
        for (var name in trellis.properties) {
          var property = trellis.properties[name];
          result[property.name] = property;
        }
      }
      return result;
    }

    get_core_properties():Property[] {
      var result = []
      for (var i in this.properties) {
        var property = this.properties[i];
        if (property.type != 'list')
          result[i] = property;
      }

      return result;
//      return Enumerable.From(this.properties).Where(
//        (p) => p.type != 'list'
//      );
    }

    get_join(main_table:string):string {
      if (!this.parent)
        return null;

      return 'JOIN  ' + this.parent.get_table_query() +
        ' ON ' + this.parent.query_primary_key() +
        ' = ' + main_table + '.' + this.properties[this.primary_key].get_field_name();
    }

    get_links():Property[] {
      var result:Property[] = [];
      for (var name in this.properties) {
        var property = this.properties[name];
        if (property.other_trellis)
          result.push(property);
      }
      return result;
    }

    get_plural():string {
      return this.plural || this.name + 's';
    }

    get_table_name():string {
//      console.log('get_table_name', this.name, this.is_virtual, this.plural, this.table)
      if (this.is_virtual) {
        if (this.parent) {
          return this.parent.get_table_name();
        }
        else {
          throw new Error('Cannot query trellis ' + this.name + ' since it is virtual and has no parent');
        }
      }
      if (this.table) {
        if (this.table.db_name)
          return this.table.db_name + '.' + this.table.name;
        else
          return this.table.name;
      }
      if (this.plural)
        return this.plural;

      return this.name + 's';
    }

    get_table_query():string {
      if (this.table && this.table.query)
        return this.table.query;

      return this.get_table_name();
    }

    get_tree():Trellis[] {
      var trellis = this;
      var tree:Trellis[] = [];

      do {
        tree.unshift(trellis)
      }
      while (trellis = trellis.parent);

      return tree;
    }

    load_from_object(source:ITrellis_Source) {
      for (var name in source) {
        if (name != 'name' && name != 'properties' && this[name] !== undefined && source[name] !== undefined) {
          this[name] = source[name];
        }
      }

      for (name in source.properties) {
        this.add_property(name, source.properties[name]);
      }
    }

    query_primary_key():string {
      return this.get_table_name() + '.' + this.properties[this.primary_key].get_field_name();
    }

    sanitize_property(property) {
      if (typeof property === 'string') {
        var properties = this.get_all_properties();
        if (properties[property] === undefined)
          throw new Error(this.name + ' does not contain a property named ' + property + '.');

        return properties[property];
      }

      return property;
    }

    set_parent(parent:Trellis) {
      this.parent = parent;

      if (!parent.primary_key)
        throw new Error(parent.name + ' needs a primary key when being inherited by ' + this.name + '.');

      parent.clone_property(parent.primary_key, this);
      this.primary_key = parent.primary_key;
    }
  }
}