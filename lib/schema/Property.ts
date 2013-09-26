/**
 * Created with JetBrains PhpStorm.
 * User: Chris Johnson
 * Date: 9/18/13
 * Time: 5:40 PM
 */
/// <reference path="../references.ts"/>
/// <reference path="../../defs/when.d.ts"/>

module Ground {

  export enum Relationships {
    one_to_one,
    one_to_many,
    many_to_many
  }

  export class Property {
    name:string = null;
    parent:Trellis = null;
    type:string = null;
    is_readonly:boolean = false;
    insert:string = null;
    other_property:string = null;
    default = null;
    other_trellis:Trellis = null;
    other_trellis_name:string = null;
    is_private:boolean = false;
    is_virtual:boolean = false;

    constructor(name:string, source:IProperty_Source, trellis:Trellis) {
      for (var i in source) {
        if (this.hasOwnProperty(i))
          this[i] = source[i];
      }

      if (source.trellis) {
        this.other_trellis_name = source.trellis;
      }

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

    get_field_override(create_if_missing:boolean = false):IField {
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
      if (!property_type)
        throw new Error(this.name + ' could not find valid field type: ' + this.type);

      return property_type.get_field_type();
    }

    get_field_value(value, as_service:boolean = false):Promise {
      if (typeof value === 'string')
        value = value.replace(/'/g, "\\'", value);

      if (value === true)
        value = 'TRUE';
      else if (value === false)
        value = 'FALSE';
      if (value === null || value === undefined)
        value = 'NULL';
      else if (this.type == 'string' || this.type == 'text') {
        value = "'" + value.replace(/[\r\n]+/, "\n");
      }
      else if (this.type == 'reference') {
        var trellis = value.other_trellis || this.other_trellis;
        var ground = this.parent.ground;
        trellis = ground.trellises[trellis];

        return ground.update_object(trellis, value, as_service)
          .then((entity)=> {
            var other_id = this.get_other_id(value);
            if (other_id !== null)
              value = other_id;
            else
              value = entity[trellis.primary_key];

            if (value === null || value === undefined)
              value = 'NULL';

            return value;
          });
      }

      return when.resolve(value);
    }

    get_other_id(entity) {
      var value = entity[this.other_trellis.primary_key];
      if (value === undefined)
        value = null;

      return value;
    }

    get_other_property(create_if_none:boolean = true):Property {
      var property;
      if (this.other_property) {
        return this.other_trellis.properties[this.other_property];
      }
      else {
        for (var name in this.other_trellis.properties) {
          property = this.other_trellis.properties[name];
          if (property.other_trellis === this.parent) {
            return property;
          }
        }
      }

      if (this.other_trellis === this.parent)
        return null;

      if (!create_if_none)
        return null;

      // If there is no existing connection defined in this trellis, create a dummy
      // connection and assume that it is a list.  This means that implicit connections
      // are either one-to-many or many-to-many, never one-to-one.
      var attributes:IProperty_Source = <IProperty_Source>{}
      attributes.type = 'list';
      attributes.trellis = this.parent.name;
      return new Property(this.other_trellis.name, attributes, this.other_trellis);
    }

    get_property_type():Property_Type {
      var types = this.parent.ground.property_types;
      if (types[this.type] !== undefined)
        return types[this.type];

      return null;
    }

    get_relationship():Relationships {
      var field = this.get_field_override();
      if (field && field.relationship) {
        return Relationships[field.relationship];
      }

      var other_property = this.get_other_property();
      if (!other_property)
        throw new Error(this.parent.name + '.' + this.name + ' does not have a reciprocal reference.');

      if (this.type == 'list') {
        if (other_property.type == 'list')
          return Relationships.many_to_many;
        else
          return Relationships.one_to_many;
      }
      return Relationships.one_to_one;
    }

//    get_referenced_trellis():Trellis {
//      var other = this.parent.ground.trellises[this.trellis];
//      if (!other)
//        throw new Error('Could not find reference to property ' + this.name + ' for ' + this.trellis + '.');
//
//      return other;
//
//    }
  }
}