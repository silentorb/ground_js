/**
* User: Chris Johnson
* Date: 9/19/13
*/
/// <reference path="../Ground_Test.ts"/>
/// <reference path="../../defs/buster.d.ts"/>
var Ground_Test = require('../Ground_Test');

var buster = require("buster");

//var assert = buster.assert;
var when = require("when");

buster.testCase("Database test", {
    setUp: function () {
        Ground_Test.setup(this);
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
    "map table name": function () {
        var _this = this;
        return this.fixture.prepare_database().then(function () {
            return _this.db.query('SELECT * FROM base_objects');
        }).then(function (rows) {
            return assert(true);
        });
    },
    "populate": function () {
        var _this = this;
        return this.fixture.prepare_database().then(function () {
            return _this.fixture.populate();
        }).then(function () {
            return _this.db.query('SELECT * FROM warriors');
        }).then(function (rows) {
            return assert.greater(rows.length, 0);
        });
    }
});

//# sourceMappingURL=db-test.js.map
