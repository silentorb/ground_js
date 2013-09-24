/**
 * Created with JetBrains PhpStorm.
 * User: Chris Johnson
 * Date: 9/18/13
 * Time: 5:40 PM
 */
/// <reference path="references.ts"/>
module Ground {
  export class Property {
    public name:string;
    public parent:Trellis;
    public type:string;
    public link_class;
    public is_readonly:boolean = false;
    public insert:string;
    public property:string;
    public default;
    public is_private:boolean = false;
    public is_virtual:boolean = false;

    constructor(name:string, source, trellis:Trellis) {
      MetaHub.extend(this, source);

      this.name = name;
      this.parent = trellis;
    }

    get_field_name():string {
      var field = this.get_field_override();
      if (field) {
        if (field.name)
          return field.name;

        if (field.share)
          return field.share;
      }

      return this.name;
    }

    get_field_override(create_if_missing:boolean = false) {
      var table = this.parent.table;
      if (!table) {
        if (!create_if_missing)
          return null;

        table = Table.create_from_trellis(this.parent);
      }

      if (table.properties[this.name] === undefined) {
        if (!create_if_missing)
          return null;

        table.properties[this.name] = {};
      }

      return table.properties[this.name];
    }

    get_field_type() {
      var property_type = this.get_property_type();
      if (property_type)
        return property_type.get_field_type();
console.log('types:', Object.keys(this.parent.ground.property_types))
      throw new Error(this.name + ' could not find valid field type: ' + this.type);
    }

    get_property_type():Property_Type {
      var types = this.parent.ground.property_types;
      if (types[this.type] !== undefined)
        return types[this.type];

      return null;
    }

  }
}