/**
* User: Chris Johnson
* Date: 9/23/13
*/
/// <reference path="../Ground_Test.ts"/>
/// <reference path="../../defs/buster.d.ts"/>
var Ground_Test = require('../Ground_Test');
var buster = require("buster");

buster.testCase("Database test", {
    setUp: function () {
        var fixture = new Ground_Test.Fixture('test');
        this.ground = fixture.ground;
        this.db = fixture.ground.db;
        //    return this.db.drop_all_tables();
    },
    "load trellises": function () {
        this.ground.load_schema_from_file('test-trellises.json');
        assert.greater(Object.keys(this.ground.trellises).length, 0);
        assert.greater(Object.keys(this.ground.trellises['warrior'].properties).length, 2);
        assert.greater(Object.keys(this.ground.property_types).length, 10);
    }
});

//# sourceMappingURL=core-test.js.map
