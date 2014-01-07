/**
* User: Chris Johnson
* Date: 10/2/13
*/
/// <reference path="../Ground_Test.ts"/>
/// <reference path="../../defs/buster.d.ts"/>
var Ground_Test = require('../Ground_Test');
var Ground = require('../../ground');
var buster = require("buster");
var when = require("when");

buster.testCase("Query test", {
    setUp: function () {
        Ground_Test.setup(this);
        return this.fixture.prepare_database();
    },
    select: function () {
        var _this = this;
        var query = this.ground.create_query('character_item');
        Ground.Update.log_queries = true;
        return this.fixture.populate().then(function () {
            return _this.ground.create_query('warrior').run();
        }).then(function (objects) {
            console.log(arguments);
            assert.equals(1, objects.length);
            assert.equals('Bob', objects[0].name);
        }).then(function () {
            return query.run();
        }).then(function (objects) {
            console.log(objects);
            assert.equals(1, objects[0].owner.id);
        }).then(function () {
            return query.run_as_service();
        }).then(function (result) {
            assert.equals(1, result.objects[0].owner.id);
        });
    }
});

require('source-map-support').install();
//# sourceMappingURL=query-test.js.map
