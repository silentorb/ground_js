/**
* Created with JetBrains PhpStorm.
* User: Chris Johnson
* Date: 9/18/13
*/
/// <reference path="../../../defs/node.d.ts"/>
/// <reference path="../../metahub/metahub.ts"/>
/// <reference path="references.ts"/>
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var fs = require('fs');

var Ground_JS;
(function (Ground_JS) {
    var Property_Type = (function () {
        function Property_Type(name, info, types) {
            if (info.parent) {
                var parent = types[info.parent];

                //MetaHub.extend(this, parent);
                this.parent = parent;
            } else {
                this.field_type = info.field_type;
            }

            this.name = name;
            this.property_class = 'Property';
            if (info.default) {
                this.default_value = info.default;
            }
        }
        return Property_Type;
    })();
    Ground_JS.Property_Type = Property_Type;

    var Ground = (function (_super) {
        __extends(Ground, _super);
        function Ground(config, db_name) {
            _super.call(this);
            this.trellises = [];
            this.tables = [];
            this.views = [];
            this.property_types = [];
            this.expansions = [];
            this.db = new Database(config, db_name);
        }
        Ground.prototype.add_trellis = function (name, object, initialize_parent) {
            if (typeof initialize_parent === "undefined") { initialize_parent = true; }
            var trellis = new Trellis(name, this);
            if (object)
                trellis.load_from_object(object);

            this.trellises[name] = trellis;

            if (initialize_parent)
                this.initialize_trellises([trellis], this.trellises);

            return trellis;
        };

        Ground.prototype.initialize_trellises = function (subset, all) {
            if (typeof all === "undefined") { all = null; }
            if (!all)
                all = subset;
        };

        Ground.load_json_from_file = function (filename) {
            var json = fs.readFileSync(filename, 'ascii');
            if (!json)
                throw new Error('Could not find schmea file: ' + filename);
        };

        Ground.prototype.load_schema_from_file = function (filename) {
            var data = Ground.load_json_from_file(filename);
            this.parse_schema(data);
        };

        Ground.prototype.parse_schema = function (data) {
            if (data.trellises)
                this.load_trellises(data.trellises);

            if (data.views)
                this.views = this.views.concat(data.views);

            if (data.tables)
                this.load_tables(data.tables);
        };

        Ground.prototype.load_property_types = function (filename) {
            var json = fs.readFileSync(filename, 'ascii');
            var property_types = JSON.parse(json);
            for (var name in property_types) {
                var type = new Property_Type(name, property_types[name], this.property_types);
                this.property_types[name] = type;
            }
        };

        Ground.prototype.load_tables = function (tables) {
            for (var name in tables) {
                var table = new Table(name, this);
                table.load_from_schema(tables[name]);
                this.tables[name] = table;
            }
        };

        Ground.prototype.load_trellises = function (trellises) {
            var subset = [];
            for (var name in trellises) {
                var trellis = this.add_trellis(name, trellises[name], false);
                subset[name] = trellis;
            }

            this.initialize_trellises(subset, this.trellises);
        };
        return Ground;
    })(MetaHub.Meta_Object);
    Ground_JS.Ground = Ground;
})(Ground_JS || (Ground_JS = {}));

