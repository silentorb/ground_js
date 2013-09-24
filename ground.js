/**
* User: Chris Johnson
* Date: 9/19/13
*/
/// <reference path="../references.ts"/>
/// <reference path="../../defs/deferred.d.ts"/>
/// <reference path="../../defs/mysql.d.ts"/>
var deferred = require('deferred');

var Ground;
(function (Ground) {
    var Database = (function () {
        function Database(settings, database) {
            this.settings = settings;
            this.database = database;
        }
        Database.prototype.create_table = function (trellis) {
            if (!trellis)
                throw new Error('Empty object was passed to create_table().');

            var table = Ground.Table.create_from_trellis(trellis);
            var sql = table.create_sql_from_trellis(trellis);
            return this.query(sql).then(function () {
                return table;
            });
        };

        Database.prototype.drop_all_tables = function () {
            var _this = this;
            return this.query('SET foreign_key_checks = 0').then(this.get_tables().map(function (table) {
                console.log('table', table);
                return _this.query('DROP TABLE IF EXISTS ' + table);
            })).then(function () {
                return _this.query('SET foreign_key_checks = 1');
            });
        };

        Database.prototype.get_tables = function () {
            return this.query('SHOW TABLES').map(function (row) {
                for (var i in row)
                    return row[i];

                return null;
            });
        };

        Database.prototype.query = function (sql) {
            var connection, def = deferred();
            var mysql = require('mysql');
            connection = mysql.createConnection(this.settings[this.database]);
            connection.connect();
            connection.query(sql, function (err, rows, fields) {
                if (err) {
                    console.log(sql);
                    throw err;
                }

                //        console.log(sql, rows)
                def.resolve(rows, fields);

                return null;
            });
            connection.end();

            return def.promise;
        };
        return Database;
    })();
    Ground.Database = Database;
})(Ground || (Ground = {}));
/**
* Created with JetBrains PhpStorm.
* User: Chris Johnson
* Date: 9/18/13
*/
/// <reference path="references.ts"/>
var Ground;
(function (Ground) {
    var Trellis = (function () {
        function Trellis(name, ground) {
            this.primary_key = 'id';
            // Property that are specific to this trellis and not inherited from a parent trellis
            this.properties = [];
            // Every property including inherited properties
            this.all_properties = [];
            this.is_virtual = false;
            this.ground = ground;
            this.name = name;
        }
        Trellis.prototype.add_property = function (name, source) {
            var property = new Ground.Property(name, source, this);
            this.properties[name] = property;
            this.all_properties[name] = property;
            return property;
        };

        Trellis.prototype.check_primary_key = function () {
            if (!this.properties[this.primary_key] && this.parent) {
                var property = this.parent.properties[this.parent.primary_key];
                this.properties[this.primary_key] = new Ground.Property(this.primary_key, property, this);
            }
        };

        Trellis.prototype.clone_property = function (property_name, target_trellis) {
            if (this.properties[property_name] === undefined)
                throw new Error(this.name + ' does not have a property named ' + property_name + '.');

            target_trellis.add_property(property_name, this.properties[property_name]);
        };

        Trellis.prototype.get_core_properties = function () {
            var result = [];
            for (var i in this.properties) {
                var property = this.properties[i];
                if (property.type != 'list')
                    result[i] = property;
            }

            return result;
            //      return Enumerable.From(this.properties).Where(
            //        (p) => p.type != 'list'
            //      );
        };

        Trellis.prototype.get_table_name = function () {
            if (this.is_virtual) {
                if (this.parent) {
                    return this.parent.get_table_name();
                } else {
                    throw new Error('Cannot query trellis ' + this.name + ' since it is virtual and has no parent');
                }
            }
            if (this.table) {
                if (this.table.db_name)
                    return this.table.db_name + '.' + this.table.name;
else
                    return this.table.name;
            }
            if (this.plural)
                return this.plural;

            return this.name + 's';
        };

        Trellis.prototype.load_from_object = function (source) {
            for (var name in source) {
                if (name != 'name' && name != 'properties' && this[name] !== undefined && source[name] !== undefined) {
                    this[name] = source[name];
                }
            }

            for (name in source.properties) {
                this.add_property(name, source.properties[name]);
            }
        };

        Trellis.prototype.set_parent = function (parent) {
            this.parent = parent;

            if (!parent.primary_key)
                throw new Error(parent.name + ' needs a primary key when being inherited by ' + this.name + '.');

            parent.clone_property(parent.primary_key, this);
            this.primary_key = parent.primary_key;
        };
        return Trellis;
    })();
    Ground.Trellis = Trellis;
})(Ground || (Ground = {}));
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

    var Core = (function () {
        function Core(config, db_name) {
            this.trellises = [];
            this.tables = [];
            this.views = [];
            this.property_types = [];
            this.expansions = [];
            //      super();
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

        Core.prototype.initialize_trellises = function (subset, all) {
            if (typeof all === "undefined") { all = null; }
            all = all || subset;

            for (var i in subset) {
                var trellis = subset[i];
                if (typeof trellis.parent === 'string') {
                    trellis.set_parent(all[trellis.parent]);
                    trellis.check_primary_key();
                }
            }
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
        return Core;
    })();
    Ground.Core = Core;
})(Ground || (Ground = {}));

module.exports = Ground;
/**
* Created with JetBrains PhpStorm.
* User: Chris Johnson
* Date: 9/18/13
*/
var MetaHub;
(function (MetaHub) {
    function remove(array, item) {
        if (typeof array.indexOf != 'function')
            return;

        var index = array.indexOf(item);
        if (index != -1)
            array.splice(index, 1);
    }
    MetaHub.remove = remove;

    function has_properties(obj) {
        for (var key in obj) {
            if (obj.hasOwnProperty(key))
                return true;
        }
        return false;
    }
    MetaHub.has_properties = has_properties;
    ;

    function is_array(obj) {
        return Object.prototype.toString.call(obj) === '[object Array]';
    }
    MetaHub.is_array = is_array;

    function size(obj) {
        var size = 0, key;
        for (key in obj) {
            if (obj.hasOwnProperty(key))
                size++;
        }
        return size;
    }
    MetaHub.size = size;
    ;

    function S4() {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    }
    MetaHub.S4 = S4;

    function extend(destination, source, names) {
        if (typeof names === "undefined") { names = null; }
        var info;

        if (typeof source == 'object' || typeof source == 'function') {
            if (names == null)
                names = Object.getOwnPropertyNames(source);

            for (var k = 0; k < names.length; ++k) {
                var name = names[k];
                if (source.hasOwnProperty(name)) {
                    if (typeof Object.getOwnPropertyDescriptor == 'function') {
                        info = Object.getOwnPropertyDescriptor(source, name);

                        if (info.get) {
                            Object.defineProperty(destination, name, info);
                            continue;
                        }
                    }

                    if (source[name] === null)
                        destination[name] = null;
else if (MetaHub.is_array(source[name]) && source[name].length == 0)
                        destination[name] = [];
else if (typeof source[name] == 'object' && !MetaHub.has_properties(source[name]))
                        destination[name] = {};
else
                        destination[name] = source[name];
                    //              else
                    //                info.value = source[name];
                    //              Object.defineProperty(destination, name, info);
                    //            }
                }
            }
        }
        return destination;
    }
    MetaHub.extend = extend;

    // Pseudo GUID
    function guid() {
        return S4() + S4() + "-" + S4() + "-" + S4();
    }
    MetaHub.guid = guid;

    function clone(source, names) {
        var result = {};
        MetaHub.extend(result, source, names);
        return result;
    }
    MetaHub.clone = clone;

    function get_connection(a, b) {
        for (var x = 0; x < a.internal_connections.length; x++) {
            if (a.internal_connections[x].other === b) {
                return a.internal_connections[x];
            }
        }

        return null;
    }
    MetaHub.get_connection = get_connection;

    function map(source, action) {
        var result = {};
        for (var key in source) {
            result[key] = action(source[key], key, source);
        }

        return result;
    }
    MetaHub.map = map;

    function map_to_array(source, action) {
        var result = [];
        for (var key in source) {
            result.push(action(source[key], key, source));
        }
        return result;
    }
    MetaHub.map_to_array = map_to_array;

    //  function get_variables(source) {
    //    var result = {};
    //    if (typeof source == 'object' || typeof source == 'function') {
    //      for (var k in source) {
    //        if (source.hasOwnProperty(k) && typeof source[k] != 'function') {
    //          result[k] = source[k];
    //        }
    //      }
    //    }
    //    return result;
    //  }
    //  function serialize(source) {
    //    if (source.original_properties) {
    //      var temp = {};
    //      MetaHub.extend(temp, source, source.original_properties);
    //      return JSON.stringify(temp);
    //      //return JSON.stringify(source, source.original_properties);
    //    }
    //    else {
    //      return JSON.stringify(source);
    //    }
    //  };
    var Meta_Object = (function () {
        function Meta_Object() {
            this.is_meta_object = true;
            this.events = {};
            this.internal_connections = new Array();
        }
        Meta_Object.connect_objects = function (first, other, type) {
            var connection = MetaHub.get_connection(first, other);
            if (connection) {
                if (connection.type != type && type) {
                    connection.type = type;
                    return true;
                }

                return false;
            }

            if (type === 'parent')
                first.parent = other;

            connection = new Meta_Connection(first, other, type);
            first.internal_connections.push(connection);
            return true;
        };

        Meta_Object.disconnect_objects = function (first, other) {
            var connection = MetaHub.get_connection(first, other);
            if (connection) {
                var type = connection.type;
                MetaHub.remove(first.internal_connections, connection);

                for (var event in other.events) {
                    first.unlisten(other, event);
                }

                connection.parent = null;
                connection.other = null;

                first.invoke('disconnect.' + type, other, first);

                if (connection.type === 'parent') {
                    var parents = first.get_connections('parent');
                    if (parents.length == 0) {
                        delete first.parent;
                        if (!first.__disconnecting_everything) {
                            first.disconnect_all();
                        }
                    } else {
                        first.parent = parents[0];
                    }
                }
            }
        };

        Meta_Object.has_property = function (target, name) {
            var x, names = name.split('.');
            for (x = 0; x < names.length; x++) {
                if (!target.hasOwnProperty(names[x]))
                    return false;

                target = target[names[x]];
            }

            return true;
        };

        Meta_Object.invoke_binding = function (source, owner, name) {
            if (!owner.events[name])
                return;

            var args = Array.prototype.slice.call(arguments, 3);
            var info = owner.events[name], length = info.length;
            for (var x = 0; x < length; ++x) {
                var binding = info[x], listener = binding.listener;

                if (listener !== source && listener) {
                    binding.method.apply(listener, args);
                }
            }
        };

        //       toString () {
        //        return this.meta_source + ":" + this.guid;
        //      };
        Meta_Object.prototype.listen = function (other, name, method, options) {
            if (typeof options === "undefined") { options = null; }
            if (typeof method !== 'function')
                throw new Error('Meta_Object.listen requires the passed method to be a function, not a "' + typeof method + '"');

            if (other !== this) {
                if (!other.is_meta_object) {
                    this.connect(other, '');
                }
            }

            if (other.events[name] == null)
                other.events[name] = [];

            var event = {
                method: method,
                listener: this,
                async: false
            };

            if (typeof options == 'object') {
                if (options.once) {
                    event.method = function () {
                        MetaHub.remove(other.events[name], event);
                        method.apply(this, Array.prototype.slice.call(arguments));
                    };
                }
                if (options.async) {
                    event.async = true;
                }
            }

            if (options && options.first)
                other.events[name].unshift(event);
else
                other.events[name].push(event);
        };

        Meta_Object.prototype.unlisten = function (other, name) {
            if (other.events[name] == null)
                return;

            var list = other.events[name];
            for (var i = list.length - 1; i >= 0; --i) {
                if (list[i].listener === this) {
                    list.splice(i, 1);
                }
            }

            if (list.length == 0) {
                delete other.events[name];
            }
        };

        Meta_Object.prototype.invoke = function (name) {
            var args = [];
            for (var _i = 0; _i < (arguments.length - 1); _i++) {
                args[_i] = arguments[_i + 1];
            }
            if (!this.events[name])
                return;

            var info = this.events[name];
            for (var x = 0; x < info.length; ++x) {
                info[x].method.apply(info[x].listener, args);
            }
        };

        Meta_Object.prototype.invoke_async = function (name) {
            var args = Array.prototype.slice.call(arguments, 1);
            var finish = args[args.length - 1];
            if (!this.events[name]) {
                if (typeof finish == 'function')
                    finish.apply(this, args.slice(0, args.length - 1));
                return;
            }

            var info = this.events[name];
            var loop = function (x) {
                if (x < info.length) {
                    // Use this eventually:
                    // args[args.length - 1] = loop.bind(this, x + 1);
                    args[args.length - 1] = function () {
                        loop(x + 1);
                    };
                    info[x].method.apply(info[x].listener, args);
                } else {
                    if (typeof finish == 'function')
                        finish.apply(this, args.slice(0, args.length - 1));
                }
            };
            loop(0);
        };

        Meta_Object.prototype.gather = function (name) {
            var args = Array.prototype.slice.call(arguments, 1);
            if (!this.events[name])
                return args[0];

            var info = this.events[name];
            for (var x = 0; x < info.length; ++x) {
                args[0] = info[x].method.apply(info[x].listener, args);
            }
            return args[0];
        };

        Meta_Object.prototype.connect = function (other, type, other_type) {
            if (typeof other_type === "undefined") { other_type = undefined; }
            if (other_type == undefined)
                other_type = type;

            if (!other.is_meta_object)
                return;

            if (!Meta_Object.connect_objects(this, other, type)) {
                return;
            }

            Meta_Object.connect_objects(other, this, other_type);

            this.invoke('connect.' + type, other, this);
            other.invoke('connect.' + other_type, this, other);
        };

        Meta_Object.prototype.disconnect = function (other) {
            Meta_Object.disconnect_objects(this, other);
            Meta_Object.disconnect_objects(other, this);
        };

        Meta_Object.prototype.disconnect_all = function (type) {
            if (type == undefined) {
                for (var x = this.internal_connections.length - 1; x >= 0; --x) {
                    this.disconnect(this.internal_connections[x].other);
                }
                this.internal_connections = [];
                this.invoke('disconnect-all', this);
            } else {
                var connections = this.get_connections(type);
                for (var x = connections.length - 1; x >= 0; --x) {
                    this.disconnect(connections[x]);
                }
            }
            //      delete this.__disconnecting_everything;
        };

        Meta_Object.prototype.is_listening = function (other, name) {
            if (!other.is_meta_object)
                return false;

            for (var x in other.events[name]) {
                if (other.events[name][x].listener === this)
                    return true;
            }
            return false;
        };

        // This function is long and complicated because it is a heavy hitter both in usefulness
        // and performance cost.
        Meta_Object.prototype.get_connections = function () {
            var filters = [];
            for (var _i = 0; _i < (arguments.length - 0); _i++) {
                filters[_i] = arguments[_i + 0];
            }
            var x;
            var first_filter = filters.shift();

            var result = [];
            if (typeof first_filter == 'string') {
                for (x = 0; x < this.internal_connections.length; x++) {
                    if (this.internal_connections[x].type == first_filter) {
                        result.push(this.internal_connections[x].other);
                    }
                }
            } else if (typeof first_filter == 'function') {
                for (x = 0; x < this.internal_connections.length; x++) {
                    if (first_filter(this.internal_connections[x].other)) {
                        result.push(this.internal_connections[x].other);
                    }
                }
            }

            for (var f = 0; f < filters.length; f++) {
                var filter = filters[f];

                if (typeof filter == 'string') {
                    for (x = result.length - 1; x >= 0; x--) {
                        if (this.internal_connections[result[x]].type != filter) {
                            result.splice(x, 1);
                        }
                    }
                } else if (typeof filter == 'function') {
                    for (x = result.length - 1; x >= 0; x--) {
                        if (!filter(result[x])) {
                            result.splice(x, 1);
                        }
                    }
                }
            }

            return result;
        };

        Meta_Object.prototype.get_connection = function (filter) {
            return this.get_connections(filter)[0];
        };

        Meta_Object.prototype.define_connection_getter = function (property_name, connection_name) {
            this[property_name] = function (filter) {
                return this.get_connections(connection_name, filter);
            };
        };

        Meta_Object.prototype.define_object = function (property_name, connection_name) {
            var property = {};
            this[property_name] = property;

            this.listen(this, 'connect.' + connection_name, function (item) {
                property[item.name] = item;
            });

            this.listen(this, 'disconnect.' + connection_name, function (item) {
                delete property[item];
            });
        };

        Meta_Object.prototype.optimize_getter = function (property_name, connection_name) {
            var array = [];
            this[property_name] = array;

            this.listen(this, 'connect.' + connection_name, function (item) {
                array.push(item);
            });

            this.listen(this, 'disconnect.' + connection_name, function (item) {
                MetaHub.remove(array, item);
            });
        };
        return Meta_Object;
    })();
    MetaHub.Meta_Object = Meta_Object;

    var Meta_Connection = (function () {
        function Meta_Connection(parent, other, type) {
            this.type = '';
            this.parent = parent;
            this.other = other;
            this.type = type;
        }
        return Meta_Connection;
    })();
    MetaHub.Meta_Connection = Meta_Connection;
})(MetaHub || (MetaHub = {}));
/**
* User: Chris Johnson
* Date: 9/19/13
*/
/// <reference path="../references.ts"/>
/// <reference path="../../../metahub/metahub.ts"/>
var Ground;
(function (Ground) {
    var Table = (function () {
        function Table(name, ground) {
            this.properties = [];
            this.name = name;
            this.ground = ground;
        }
        Table.prototype.connect_trellis = function (trellis) {
            this.trellis = trellis;
            trellis.table = this;
        };

        Table.create_from_trellis = function (trellis, ground) {
            if (typeof ground === "undefined") { ground = null; }
            if (trellis.table)
                return trellis.table;

            ground = ground || trellis.ground;

            var table = new Table(trellis.get_table_name(), ground);
            table.connect_trellis(trellis);
            return table;
        };

        Table.create_sql_from_array = function (table_name, source, primary_keys, indexes) {
            if (typeof primary_keys === "undefined") { primary_keys = []; }
            if (typeof indexes === "undefined") { indexes = []; }
            var fields = MetaHub.map_to_array(source, function (field, index) {
                var name = field.name || index;
                var type = field.type;

                if (!type)
                    throw new Error('Field ' + name + 'is missing a type.');

                var field_sql = '`' + name + '` ' + type;
                if (primary_keys.indexOf(name) > -1) {
                    if (type.search(/INT/) > -1 && primary_keys[0] == name)
                        field_sql += ' AUTO_INCREMENT';
                }
                if (field.default !== undefined)
                    field_sql += ' DEFAULT ' + Table.format_value(field.default);

                return field_sql;
            });

            if (fields.length == 0) {
                if (source.length > 0)
                    throw new Error('None of the field arguments for creating ' + table_name + ' have a type.');
else
                    throw new Error('Cannot creat a table without fields: ' + table_name + '.');
            }

            var primary_fields = MetaHub.map_to_array(primary_keys, function (key) {
                return '`' + key + '`';
            });
            fields.push('PRIMARY KEY (' + primary_fields.join(', ') + ")\n");
            fields = fields.concat(MetaHub.map_to_array(indexes, function (index, key) {
                return Table.generate_index_sql(key, index);
            }));
            var sql = 'CREATE TABLE IF NOT EXISTS `' + table_name + "` (\n";
            sql += fields.join(",\n") + "\n";
            sql += ");\n";
            return sql;
        };

        Table.prototype.create_sql_from_trellis = function (trellis) {
            var primary_keys;
            if (!trellis) {
                if (!this.trellis)
                    throw new Error('No valid trellis to generate sql from.');

                trellis = this.trellis;
            }

            var core_properties = trellis.get_core_properties();
            if (Object.keys(core_properties).length === 0)
                throw new Error('Cannot create a table for ' + trellis.name + '. It does not have any core properties.');

            var fields = [];
            for (var name in core_properties) {
                var property = core_properties[name];
                var field_test = this.properties[property.name];

                if (field_test && field_test.share)
                    continue;

                var field = {
                    name: property.get_field_name(),
                    type: property.get_field_type(),
                    default: undefined
                };

                if (property.default !== undefined)
                    field.default = property.default;

                fields.push(field);
            }

            if (this.primary_keys && this.primary_keys.length > 0) {
                primary_keys = MetaHub.map(this.primary_keys, function (name) {
                    if (!trellis.properties[name])
                        throw new Error('Error creating ' + trellis.name + '; it does not have a primary key named ' + name + '.');

                    return trellis.properties[name].get_field_name();
                });
            } else {
                primary_keys = [trellis.properties[trellis.primary_key].get_field_name()];
            }

            return Table.create_sql_from_array(this.name, fields, primary_keys, this.indexes);
        };

        Table.format_value = function (value) {
            if (typeof value === 'string')
                return "'" + value + "'";

            if (value === null)
                return 'NULL';

            if (value === true)
                return 'TRUE';

            if (value === false)
                return 'FALSE';

            return value;
        };

        Table.generate_index_sql = function (name, index) {
            var name_string, index_fields = index.fields.join('`, `');
            var result = '';

            if (index.unique) {
                result += 'UNIQUE ';
                name_string = '';
            } else {
                name_string = '`' + name + '`';
            }

            result += "KEY " + name_string + ' (`' + index_fields + "`)\n";
            return result;
        };

        Table.prototype.load_from_schema = function (source) {
            MetaHub.extend(this, source);
            if (this.ground.trellises[this.name]) {
                this.trellis = this.ground.trellises[this.name];
                this.trellis.table = this;
            }
        };
        return Table;
    })();
    Ground.Table = Table;
})(Ground || (Ground = {}));
/**
* Created with JetBrains PhpStorm.
* User: Chris Johnson
* Date: 9/18/13
* Time: 5:40 PM
*/
/// <reference path="references.ts"/>
var Ground;
(function (Ground) {
    var Property = (function () {
        function Property(name, source, trellis) {
            this.is_readonly = false;
            this.is_private = false;
            this.is_virtual = false;
            MetaHub.extend(this, source);

            this.name = name;
            this.parent = trellis;
        }
        Property.prototype.get_field_name = function () {
            var field = this.get_field_override();
            if (field) {
                if (field.name)
                    return field.name;

                if (field.share)
                    return field.share;
            }

            return this.name;
        };

        Property.prototype.get_field_override = function (create_if_missing) {
            if (typeof create_if_missing === "undefined") { create_if_missing = false; }
            var table = this.parent.table;
            if (!table) {
                if (!create_if_missing)
                    return null;

                table = Ground.Table.create_from_trellis(this.parent);
            }

            if (table.properties[this.name] === undefined) {
                if (!create_if_missing)
                    return null;

                table.properties[this.name] = {};
            }

            return table.properties[this.name];
        };

        Property.prototype.get_field_type = function () {
            var property_type = this.get_property_type();
            if (property_type)
                return property_type.get_field_type();
            console.log('types:', Object.keys(this.parent.ground.property_types));
            throw new Error(this.name + ' could not find valid field type: ' + this.type);
        };

        Property.prototype.get_property_type = function () {
            var types = this.parent.ground.property_types;
            if (types[this.type] !== undefined)
                return types[this.type];

            return null;
        };
        return Property;
    })();
    Ground.Property = Property;
})(Ground || (Ground = {}));
