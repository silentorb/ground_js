/// <reference path="../../../vineyard-metahub/metahub.d.ts"/>
/// <reference path="../../dist/schema.d.ts"/>

module Ground {
  interface ILink {
    other:Trellis
    property:Property
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
}