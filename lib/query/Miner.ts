/// <reference path="interfaces.ts"/>
/// <reference path="Embedded_Reference.ts"/>
/// <reference path="Field_List.ts"/>
/// <reference path="Join.ts"/>

module Ground {

  export interface IQueryable {

  }

  export class Miner {
    messenger:MetaHub.Meta_Object
    db:IQueryable
    schema:Schema

    constructor(schema:Schema, db:IQueryable, messenger:MetaHub.Meta_Object) {
      this.schema = schema
      this.db = db
      this.messenger = messenger
    }
  }
}