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

  setUp: function (done) {
    var fixture = new Ground_Test.Fixture('test');
    this.db = fixture.ground.db;
    var stack = new Error().stack
    console.log( stack )
    this.db.drop_all_tables()
      .then(()=>{console.log('finished');done()});
  },
//  "test drop all tables": function (done) {
//    this.db.get_tables().then(done((tables) => {
//      console.log('b');
//      assert.equals(tables.length,0);
//    }));
//  }
    "a": function() {
    assert(true);
  }
});
