/**
 * User: Chris Johnson
 * Date: 9/19/13
 */
/// <reference path="../references.ts"/>
/// <reference path="../../../metahub/metahub.ts"/>

module Ground {
  export class Table {
    name:string;
    properties:Array<any> = [];
    indexes:Array<any>;
    ground:Core;
    db_name:string;
    trellis:Trellis;

    constructor(name:string, ground:Core) {
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