/**
 * User: Chris Johnson
 * Date: 9/19/13
 */
/// <reference path="../Ground.ts"/>
/// <reference path="../Trellis.ts"/>

module Ground_JS {
  export class Table {
    name:string;
    properties:Array = [];
    indexes:Array[];
    ground:Ground;
    db_name:string;
    trellis:Trellis;

    constructor(name:string, ground:Ground) {
      this.name = name;
      this.ground = ground;
    }

    load_from_schema(source) {
      MetaHub.extend(this, source);
      if (this.ground.trellises[this.name]) {
        this.trellis = this.ground.trellises[this.name];
        this.trellis.table = this;
      }
    }
  }
}