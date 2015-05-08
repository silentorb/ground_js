/// <reference path="interfaces.ts"/>
/// <reference path="Embedded_Reference.ts"/>
/// <reference path="Field_List.ts"/>
/// <reference path="Join.ts"/>

///***var MetaHub = require('vineyard-metahub')
///***var landscape = require('./landscape')

module mining {

  export interface IQueryable {
    query(sql:string, args?:any[], pool?):Promise
    query_single(sql:string, args?:any[]):Promise
  }

  export class Miner {
    messenger:MetaHub.Meta_Object
    db:IQueryable
    schema:landscape.Schema

    constructor(schema:landscape.Schema, db:IQueryable, messenger:MetaHub.Meta_Object) {
      this.schema = schema
      this.db = db
      this.messenger = messenger
    }
  }
}

module.exports = mining