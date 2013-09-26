/**
 * User: Chris Johnson
 * Date: 9/19/13
 */
/// <reference path="../Ground_Test.ts"/>
/// <reference path="../../defs/buster.d.ts"/>
import Ground_Test = require('../Ground_Test');

var buster = require("buster");
//var assert = buster.assert;

buster.testCase("Database test", {

  setUp: function () {
    var fixture = this.fixture = new Ground_Test.Fixture('test');
    this.ground = fixture.ground;
    this.db = fixture.ground.db;
//    var stack = new Error().stack
//    console.log( new Error().stack )
  },
//  "drop all tables": function () {
//    return this.db.drop_all_tables()
//      .then(()=> this.db.get_tables())
//      .then((tables) => assert.equals(0, tables.length))
//  },
//  "create table": function () {
//    this.fixture.load_schema();
//    return this.db.drop_all_tables()
//      .then(()=>this.db.create_table(this.ground.trellises['warrior']))
//      .then(() => this.db.get_tables())
//      .then((tables) => assert.equals(1, tables.length))
//  },
  "populate": function () {
    return this.fixture.prepare_database()
      .then(()=>this.fixture.populate())
      .then(()=> this.db.query('SELECT * FROM warriors'))
      .then((rows)=>assert.greater(rows.length, 0))
  }

});
