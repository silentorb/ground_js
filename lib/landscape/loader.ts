/// <reference path="Trellis.ts"/>
/// <reference path="Property.ts"/>

module landscape {
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

    export function initialize_property(property:Property, source:IProperty_Source) {
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
  }
}