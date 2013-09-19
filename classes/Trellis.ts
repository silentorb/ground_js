/**
 * Created with JetBrains PhpStorm.
 * User: Chris Johnson
 * Date: 9/18/13
 */
/// <reference path="Ground.ts"/>
/// <reference path="Property.ts"/>
/// <reference path="db/Table.ts"/>

module Ground_JS {
  export class Trellis {
    plural:string;
    parent:Trellis;
    ground:Ground;
    table:Table;
    name:string;
    primary_key:string = 'id';
    // Property that are specific to this trellis and not inherited from a parent trellis
    properties:Array<Property> = new Array<Property>();
    // Every property including inherited properties
    all_properties:Array<Property> = new Array<Property>();
    is_virtual:boolean = false;

    constructor(name:string, ground:Ground) {
      this.ground = ground;
      this.name = name;
    }

    add_property(name:string, source):Property {
      var property = new Property(name, source, this);
      this.properties[name] = property;
      this.all_properties[name] = property;
      return property;
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
        var self = <any> this;
        if (name != 'name' && name != 'properties' && self.hasOwnProperty(name) && source[name] !== undefined) {
          this[name] = source[name];
        }
      }

      for (name in source.properties) {
        this.add_property(name, source.properties[name]);
      }
    }
  }
}