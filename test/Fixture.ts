/**
 * User: Chris Johnson
 * Date: 9/19/13
 */
/// <reference path="../classes/Ground.ts"/>
/// <reference path="../../../lib/Config.ts"/>

module Ground_Test {
  export class Fixture{
    ground:Ground_JS.Ground;

    constructor(db_name:string,test = null){
      var config = Config.load();
      this.ground = new Ground_JS.Ground(db_name);
    }
  }
}