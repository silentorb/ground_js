/**
* Created with JetBrains PhpStorm.
* User: Chris Johnson
* Date: 9/18/13
*/
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
/// <reference path="require.ts"/>
/// <reference path="../references.ts"/>
/// <reference path="../db/Database.ts"/>
/// <reference path="../schema/Trellis.ts"/>
/// <reference path="../operations/Query.ts"/>
/// <reference path="../operations/Update.ts"/>
/// <reference path="../operations/Delete.ts"/>
/// <reference path="../../defs/node.d.ts"/>
//var MetaHub = require('metahub');
var Ground;
(function (Ground) {
    var Property_Type = (function () {
        function Property_Type(name, info, types) {
            if (info.parent) {
                var parent = types[info.parent];
                MetaHub.extend(this, parent);
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
        Property_Type.prototype.get_field_type = function () {
            if (this.field_type) {
                return this.field_type;
            }

            if (this.parent) {
                return this.parent.get_field_type();
            }

            throw new Error(this.name + " could not find valid field type.");
        };
        return Property_Type;
    })();
    Ground.Property_Type = Property_Type;

    var Core = (function (_super) {
        __extends(Core, _super);
        function Core(config, db_name) {
            _super.call(this);
            this.trellises = [];
            this.tables = [];
            this.views = [];
            this.property_types = [];
            this.expansions = [];
            this.db = new Ground.Database(config, db_name);
            var path = require('path');
            var filename = path.resolve(__dirname, 'property_types.json');
            this.load_property_types(filename);
        }
        Core.prototype.add_trellis = function (name, source, initialize_parent) {
            if (typeof initialize_parent === "undefined") { initialize_parent = true; }
            var trellis = new Ground.Trellis(name, this);
            if (source)
                trellis.load_from_object(source);

            this.trellises[name] = trellis;

            if (initialize_parent)
                this.initialize_trellises([trellis], this.trellises);

            return trellis;
        };

        Core.prototype.convert_value = function (value, type) {
            if (!value) {
                if (type == 'bool')
                    return false;

                return null;
            }

            var property_type = this.property_types[type];

            if (property_type && property_type.parent)
                return this.convert_value(value, property_type.parent.name);

            switch (type) {
                case 'list':
                case 'reference':
                    return value;
                case 'int':
                    return Math.round(value);
                case 'string':
                case 'text':
                    return value;
                case 'bool':
                    return Core.to_bool(value);
                case 'float':
                case 'double':
                case 'money':
                    return parseFloat(value.toString());
            }

            return null;
        };

        //    create_query(trellis:Trellis, base_path = '') {
        //      return new Query(trellis, base_path);
        //    }
        Core.prototype.create_query = function (trellis_name, base_path) {
            if (typeof base_path === "undefined") { base_path = ''; }
            var trellis = this.sanitize_trellis_argument(trellis_name);

            return new Ground.Query(trellis, base_path);
        };

        Core.prototype.delete_object = function (trellis, seed) {
            var trellis = this.sanitize_trellis_argument(trellis);
            var del = new Ground.Delete();
            return del.run(trellis, seed);
        };

        Core.prototype.initialize_trellises = function (subset, all) {
            if (typeof all === "undefined") { all = null; }
            all = all || subset;

            for (var i in subset) {
                var trellis = subset[i];
                if (typeof trellis.parent === 'string') {
                    trellis.set_parent(all[trellis.parent]);
                    trellis.check_primary_key();
                }

                for (var j in trellis.properties) {
                    var property = trellis.properties[j];
                    if (property.other_trellis_name)
                        property.other_trellis = this.trellises[property.other_trellis_name];
                }
            }
        };

        Core.prototype.insert_object = function (trellis, seed) {
            if (typeof seed === "undefined") { seed = {}; }
            return this.update_object(trellis, seed);
        };

        Core.is_private = function (property) {
            return property.is_private;
        };

        Core.is_private_or_readonly = function (property) {
            return property.is_private || property.is_readonly;
        };

        Core.prototype.update_object = function (trellis, seed, as_service) {
            if (typeof seed === "undefined") { seed = {}; }
            if (typeof as_service === "undefined") { as_service = false; }
            var trellis = this.sanitize_trellis_argument(trellis);

            if (seed._deleted === true || seed._deleted === 'true')
                return this.delete_object(trellis, seed);

            this.invoke(trellis.name + '.update', seed, trellis);
            var update = new Ground.Update(trellis, seed, this);
            update.is_service = as_service;
            return update.run();
        };

        Core.load_json_from_file = function (filename) {
            var fs = require('fs');
            var json = fs.readFileSync(filename, 'ascii');
            if (!json)
                throw new Error('Could not find file: ' + filename);

            return JSON.parse(json);
        };

        Core.prototype.load_property_types = function (filename) {
            var property_types = Core.load_json_from_file(filename);
            for (var name in property_types) {
                var info = property_types[name];
                var type = new Property_Type(name, info, this.property_types);
                this.property_types[name] = type;
            }
        };

        Core.prototype.load_schema_from_file = function (filename) {
            var data = Core.load_json_from_file(filename);
            this.parse_schema(data);
        };

        Core.prototype.load_tables = function (tables) {
            for (var name in tables) {
                var table_name;

                //        var trellis = this.trellises[name];
                //        if (trellis)
                //          table_name = trellis.get_table_name();
                //        else
                //          table_name = name;
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

        Core.prototype.parse_schema = function (data) {
            if (data.trellises)
                this.load_trellises(data.trellises);

            if (data.views)
                this.views = this.views.concat(data.views);

            if (data.tables)
                this.load_tables(data.tables);
        };

        Core.remove_fields = function (object, trellis, filter) {
            for (var key in object) {
                var property = trellis.properties[key];
                if (property && filter(property))
                    delete object[key];
            }
            return object;
        };

        Core.prototype.sanitize_trellis_argument = function (trellis) {
            if (!trellis)
                throw new Error('Trellis is empty');

            if (typeof trellis === 'string') {
                if (!this.trellises[trellis])
                    throw new Error('Could not find trellis named: ' + trellis + '.');

                return this.trellises[trellis];
            }

            return trellis;
        };

        Core.to_bool = function (input) {
            if (typeof input == 'string') {
                return input.toLowerCase() == 'true';
            }

            return !!input;
        };
        return Core;
    })(MetaHub.Meta_Object);
    Ground.Core = Core;
})(Ground || (Ground = {}));

module.exports = Ground;
//# sourceMappingURL=Core.js.map
