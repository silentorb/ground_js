/**
 * User: Chris Johnson
 * Date: 9/19/13
 */
  /// <reference path="../classes/references.ts"/>

var settings = {
  "test": {
    host: "localhost",
    user: "root",
    password: "",
    database: "ground_test"
  }
};

var Ground = require('../ground');

export class Fixture {
  ground:Ground.Core;
  test;

  constructor(db_name:string, test = null) {
    this.ground = new Ground.Core(settings, db_name);
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
