/// <reference path="../db/Table.ts"/>
/// <reference path="../db/Database.ts"/>

module landscape {
  export interface ISchema {
    trellises:{ [key: string]: landscape.Trellis}
    tables:Ground.Table[]
    property_types:Property_Type[]
    convert_value(value, type)
    custom_tables:Ground.Table[]
 }
}