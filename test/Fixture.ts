/**
 * User: Chris Johnson
 * Date: 9/19/13
 */
/// <reference path="../classes/Ground.ts"/>
/// <reference path="../../../lib/Config.ts"/>
import Ground_JS = require('../classes/Ground_JS');

module Ground_Test {
  export class Fixture {
    ground:Ground_JS.Ground;
    test;

    constructor(db_name:string, config = null, test = null) {
      var config = config || Config.load();
      this.ground = new Ground_JS.Ground(config, db_name);
      if (test) {
        test.ground = this.ground;
        this.test = test;
      }
    }

    prepare_database() {
      var db = this.ground.db;
      db.drop_all_tables();
//      db.create_tables(this.ground.trellises);
    }

    insert_object(trellis, data) {
//      this.ground.insert_object(trellis, data);
    }
  }
}