/**
* Created with JetBrains PhpStorm.
* User: Chris Johnson
* Date: 9/18/13
*/
/// <reference path="require.ts"/>
/// <reference path="references.ts"/>
/// <reference path="db/Database.ts"/>
/// <reference path="Trellis.ts"/>
/// <reference path="../defs/node.d.ts"/>
var Ground;
(function (Ground) {
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
    Ground.Property_Type = Property_Type;

    var Core = (function () {
        function Core(config, db_name) {
            this.trellises = [];
            this.tables = [];
            this.views = [];
            this.property_types = [];
            this.expansions = [];
            //      super();
            this.db = new Ground.Database(config, db_name);
        }
        Core.prototype.add_trellis = function (name, object, initialize_parent) {
            if (typeof initialize_parent === "undefined") { initialize_parent = true; }
            var trellis = new Ground.Trellis(name, this);
            if (object)
                trellis.load_from_object(object);

            this.trellises[name] = trellis;

            if (initialize_parent)
                this.initialize_trellises([trellis], this.trellises);

            return trellis;
        };

        Core.prototype.initialize_trellises = function (subset, all) {
            if (typeof all === "undefined") { all = null; }
            if (!all)
                all = subset;
        };

        Core.load_json_from_file = function (filename) {
            var fs = require('fs');
            var json = fs.readFileSync(filename, 'ascii');
            if (!json)
                throw new Error('Could not find schmea file: ' + filename);
        };

        Core.prototype.load_schema_from_file = function (filename) {
            var data = Core.load_json_from_file(filename);
            this.parse_schema(data);
        };

        Core.prototype.parse_schema = function (data) {
            if (data.trellises)
                this.load_trellises(data.trellises);

            if (data.views)
                this.views = this.views.concat(data.views);

            if (data.tables)
                this.load_tables(data.tables);
        };

        Core.prototype.load_property_types = function (filename) {
            var fs = require('fs');
            var json = fs.readFileSync(filename, 'ascii');
            var property_types = JSON.parse(json);
            for (var name in property_types) {
                var type = new Property_Type(name, property_types[name], this.property_types);
                this.property_types[name] = type;
            }
        };

        Core.prototype.load_tables = function (tables) {
            for (var name in tables) {
                var table = new Ground.Table(name, this);
                table.load_from_schema(tables[name]);
                this.tables[name] = table;
            }
        };

        Core.prototype.load_trellises = function (trellises) {
            var subset = [];
            for (var name in trellises) {
                var trellis = this.add_trellis(name, trellises[name], false);
                subset[name] = trellis;
            }

            this.initialize_trellises(subset, this.trellises);
        };
        return Core;
    })();
    Ground.Core = Core;
})(Ground || (Ground = {}));

module.exports = Ground;
//# sourceMappingURL=Core.js.map
