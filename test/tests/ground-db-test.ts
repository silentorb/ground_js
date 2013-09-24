/**
 * User: Chris Johnson
 * Date: 9/19/13
 */
/// <reference path="../Ground_Test.ts"/>
/// <reference path="../../../../defs/buster.d.ts"/>
import Ground_Test = require('../Ground_Test');

var buster = require("buster");
//var assert = buster.assert;

buster.testCase("Database test", {

  setUp: function () {
    var fixture = new Ground_Test.Fixture('test');
    this.ground = fixture.ground;
    this.db = fixture.ground.db;
//    var stack = new Error().stack
//    console.log( new Error().stack )
    return this.db.drop_all_tables();
  },
  "drop all tables": function () {
    return this.db.get_tables().then((tables) => {
      assert.equals(tables.length, 0);
    });
  },
  "create table": function()  {
    this.ground.load_schema_from_file('test-trellises.json');
    return this.db.create_table(this.ground.trellises['warrior'])
      .then(this.db.get_tables().then((tables) => {
        assert.equals(tables.length, 1);
      }));
  }

});
