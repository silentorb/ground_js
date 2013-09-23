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

var Fixture = (function () {
    function Fixture(db_name, test) {
        if (typeof test === "undefined") { test = null; }
        this.ground = new Ground.Core(settings, db_name);
        if (test) {
            test.ground = this.ground;
            this.test = test;
        }
    }
    Fixture.prototype.prepare_database = function () {
        var db = this.ground.db;
        db.drop_all_tables();
        //      db.create_tables(this.ground.trellises);
    };

    Fixture.prototype.insert_object = function (trellis, data) {
        //      this.ground.insert_object(trellis, data);
    };
    return Fixture;
})();
exports.Fixture = Fixture;

//# sourceMappingURL=Ground_Test.js.map
