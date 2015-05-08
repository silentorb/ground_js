/// <reference path="../../../vineyard-metahub/metahub.d.ts"/>
/// <reference path="../../dist/landscape.d.ts"/>

module mining {
  interface ILink {
    other:landscape.Trellis
    property:landscape.Property
  }

  export interface IService_Response {
    objects:any[]
    sql?:string
  }

  export interface Query_Wrapper {
    start:string
    end:string
  }

  export interface Property_Query_Source {
    name:string
    filters?:Query_Filter_Source[]
    sorts?:Query_Sort[]
    expansions?:string[]
    properties?:any[]
    subqueries?
    pager?
  }

  export interface External_Query_Source extends Property_Query_Source {
    trellis:string;
    map?
    type?:string
    queries?:External_Query_Source[]
    expires?:number
    key?:string
    version?
    return_sql?:boolean
  }

  export interface Internal_Query_Source {
    fields?
    filters?:any[]
    joins?:string[]
    property_joins?:landscape.Property[][]
    arguments?
    references?
  }

  export class InputError {
    name = "InputError"
    message
    stack
    status = 400
    details
    key

    constructor(message:string, key = undefined) {
      this.message = message
      this.key = key
    }
  }
  
  export function path_to_array(path) {
    if (MetaHub.is_array(path))
      return path

    path = path.trim()

    if (!path)
      throw new Error('Empty query path.')

    return path.split(/[\/\.]/)
  }

}