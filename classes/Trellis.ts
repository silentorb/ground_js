/**
 * Created with JetBrains PhpStorm.
 * User: Chris Johnson
 * Date: 9/18/13
 */

/// <reference path="references.ts"/>

module Ground {
  export class Trellis {
    plural:string;
    parent:Trellis;
    ground:Core;
    table:Table;
    name:string;
    primary_key:string = 'id';
    // Property that are specific to this trellis and not inherited from a parent trellis
    properties:Property[] = [];
    // Every property including inherited properties
    all_properties:Property[] = [];
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
        this.properties[this.primary_key] = new Property(this.primary_key, property, this);
      }
    }

    clone_property(property_name:string, target_trellis:Trellis) {
      if (this.properties[property_name] === undefined)
        throw new Error(this.name + ' does not have a property named ' + property_name + '.');

      target_trellis.add_property(property_name, this.properties[property_name]);
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

    get_table_name():string {
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

    load_from_object(source) {
      for (var name in source) {
        if (name != 'name' && name != 'properties' && this[name] !== undefined && source[name] !== undefined) {
          this[name] = source[name];
        }
      }

      for (name in source.properties) {
        this.add_property(name, source.properties[name]);
      }
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