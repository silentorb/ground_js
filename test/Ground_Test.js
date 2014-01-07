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

var Fixture = (function () {
    function Fixture(db_name, test) {
        if (typeof test === "undefined") { test = null; }
        this.ground = new Ground.Core(settings, db_name);
        if (test) {
            test.ground = this.ground;
            this.test = test;
        }
    }
    Fixture.prototype.load_schema = function () {
        this.ground.load_schema_from_file('test-trellises.json');
    };

    Fixture.prototype.prepare_database = function () {
        var _this = this;
        var db = this.ground.db;
        this.load_schema();
        return db.drop_all_tables().then(function () {
            return db.create_trellis_tables(_this.ground.trellises);
        });
    };

    Fixture.prototype.populate = function () {
        var _this = this;
        var db = this.ground.db;
        return this.insert_object('warrior', {
            name: 'Bob',
            race: 'legendary',
            age: 31
        }).then(function (object) {
            return _this.insert_object('character_item', {
                name: 'sword',
                owner: object.id
            });
        });
    };

    Fixture.prototype.insert_object = function (trellis, data) {
        return this.ground.insert_object(trellis, data);
    };
    return Fixture;
})();
exports.Fixture = Fixture;

var Test = (function () {
    function Test() {
        this.timeout = 1000;
    }
    return Test;
})();
exports.Test = Test;

function setup(test) {
    var fixture = test.fixture = new Fixture('test');
    test.ground = fixture.ground;
    test.timeout = 1000;
    test.db = fixture.ground.db;
}
exports.setup = setup;
//# sourceMappingURL=Ground_Test.js.map
