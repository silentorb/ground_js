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
    default;
    other_trellis:Trellis = null;
    other_trellis_name:string = null;
    is_private:boolean = false;
    is_virtual:boolean = false;
    composite_properties:any[] = null

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

    initialize_composite_reference(other_trellis:Trellis) {
      var table = other_trellis.table
      if (table && table.primary_keys && table.primary_keys.length > 1) {
        for (var i = 0; i < table.primary_keys.length; ++i) {
          var key = table.primary_keys[i]
          var name = other_trellis.name + '_' + key
          if (key != other_trellis.primary_key) {
            var other_property = other_trellis.properties[key]
            var new_property = this.parent.add_property(name, other_property.get_data())
            this.composite_properties = this.composite_properties || []
            this.composite_properties.push(new_property)
          }
        }
      }
    }

    get_data():IProperty_Source {
      var result:IProperty_Source = {
        type: this.type
      };
      if (this.other_trellis_name)
        result.trellis = this.other_trellis_name;

      if (this.is_readonly)
        result.is_readonly = this.is_readonly;

      if (this.is_private)
        result.is_private = this.is_private;

      if (this.insert)
        result.insert = this.insert;

      return result;
    }

    get_default():any {
      if (this.default == undefined && this.parent.parent && this.parent.parent.properties[this.name])
        return this.parent.parent.properties[this.name].get_default()

      return this.default
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

    static get_field_value_sync(value) {
      if (typeof value === 'string') {
        value = value.replace(/'/g, "\\'", value);
        value = "'" + value.replace(/[\r\n]+/, "\n") + "'";
//        console.log('value', value)
      }
      else if (value === true)
        value = 'TRUE';
      else if (value === false)
        value = 'FALSE';
      if (value === null || value === undefined)
        value = 'NULL';

      return value;
    }

    get_sql_value(value, type = null) {
      type = type || this.type
      var property_type = this.parent.ground.property_types[type];
      if (value === undefined || value === null) {
        value = this.get_default()
      }

      if (property_type && property_type.parent)
        return this.get_sql_value(value, property_type.parent.name);

      switch (type) {
        case 'list':
//          throw new Error('Cannot call get_sql_value on a list property')
        case 'reference':
          if (typeof value === 'object') {
            value = value[this.other_trellis.primary_key]
          }
          return value || 'NULL';
        case 'int':
          return Math.round(value);
        case 'string':
        case 'text':
          value = value.replace(/'/g, "\\'", value);
          return "'" + value.replace(/[\r\n]+/, "\n") + "'";
        case 'bool':
          return value ? 'TRUE' : 'FALSE'
        case 'float':
        case 'double':
          return new Number(value)
        case 'money':
          if (typeof value !== 'number')
            return parseFloat(value.toString());
      }

      throw new Error('Ground is not configured to process property types of ' + type + ' (' + this.type + ')')
    }

    get_field_value(value, as_service:boolean = false, update:boolean = false):Promise {
      if (typeof value === 'string')
        value = value.replace(/'/g, "\\'", value);

      if (value === true)
        value = 'TRUE';
      else if (value === false)
        value = 'FALSE';
      if (value === null || value === undefined)
        value = 'NULL';
      else if (this.type == 'string' || this.type == 'text' || this.type == 'guid') {
        value = "'" + value.replace(/[\r\n]+/, "\n") + "'";
      }
      else if (this.type == 'reference' && typeof value === 'object') {
//        console.log(value.other_trellis, this.other_trellis.name)
        var trellis = this.other_trellis;
        var ground = this.parent.ground;

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
      return new Property('_' + this.other_trellis.name, attributes, this.other_trellis);
    }

    get_property_type():Property_Type {
      var types = this.parent.ground.property_types;
      if (types[this.type] !== undefined)
        return types[this.type];

      return null;
    }

    get_referenced_trellis():Trellis {
      return this.other_trellis;
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

    query():string {
      return this.parent.get_table_name() + '.' + this.get_field_name();
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