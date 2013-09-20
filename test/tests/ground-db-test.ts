/**
 * User: Chris Johnson
 * Date: 9/19/13
 */
/// <reference path="../Fixture.ts"/>
/// <reference path="../../../../defs/buster.d.ts"/>

var buster, db, fixture, settings;

buster = require("buster");

settings = {
  "test": {
    host: "192.168.1.100",
    user: "root",
    password: "",
    database: "ground_test"
  }
};

buster.testCase("Database test", {
  setUp: function (done) {
    var fixture = new Ground_Test.Fixture('test', settings);
    db.drop_all_tables()
      .then(done);
  },
  "test query rows": function (done) {
    done()
  }
});

