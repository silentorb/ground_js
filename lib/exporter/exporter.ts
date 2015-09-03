/// <reference path="../landscape/Trellis.ts"/>
/// <reference path="../landscape/Property.ts"/>
/// <reference path="../landscape/Loader.ts"/>

module exporter {

  export function get_property_data(property:landscape.Property):landscape.loader.IProperty_Source {
    var result:landscape.loader.IProperty_Source = {
      type: property.type
    }

    if (property.other_trellis_name)
      result.trellis = property.other_trellis_name

    if (property.is_readonly)
      result.is_readonly = property.is_readonly

    if (property.is_private)
      result.is_private = property.is_private

    if (property.insert)
      result.insert = property.insert

    if (property.other_property)
      result.other_property = property.other_property

    return result
  }

  export function property_export(property:landscape.Property):landscape.loader.IProperty_Source {
    var result:landscape.loader.IProperty_Source = {
      type: property.type
    }
    if (property.other_trellis)
      result.trellis = property.other_trellis.name

    if (property.is_virtual)
      result.is_virtual = true

    if (property.insert)
      result.insert = property.insert

    if (property.is_readonly)
      result.is_readonly = true

    if (property.default !== undefined)
      result['default'] = property.default

    if (property.allow_null)
      result.allow_null = true

    if (property.other_property)
      result.other_property = property.other_property;

    return result
  }
}
