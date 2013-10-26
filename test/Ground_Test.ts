/**
 * User: Chris Johnson
 * Date: 9/19/13
 */
/// <reference path="../lib/references.ts"/>

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

  load_schema() {
    this.ground.load_schema_from_file('test-trellises.json');
  }

  prepare_database():Promise {
    var db = this.ground.db;
    this.load_schema();
    return db.drop_all_tables()
      .then(()=>  db.create_trellis_tables(this.ground.trellises))
  }

  populate():Promise {
    var db = this.ground.db;
    return this.insert_object('warrior', {
      name: 'Bob',
      race: 'legendary',
      age: 31
    })
      .then((object)=> this.insert_object('character_item', {
        name: 'sword',
        owner: object.id
      }))
  }

  insert_object(trellis, data):Promise {
    return this.ground.insert_object(trellis, data);
  }
}

export class Test {
  fixture:Fixture;
  ground:Ground.Core;
  timeout = 1000;
  db:Ground.Database;
}

export function setup(test) {
  var fixture = test.fixture = new Fixture('test');
  test.ground = fixture.ground;
  test.timeout = 1000;
  test.db = fixture.ground.db;
}