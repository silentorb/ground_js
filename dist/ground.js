/// <reference path="../Core.ts"/>
var uuid = require('node-uuid');
var Ground;
(function (Ground) {
    var Update = (function () {
        function Update(trellis, seed, ground) {
            this.override = true;
            this.main_table = 'node';
            this.log_queries = false;
            if (typeof seed !== 'object')
                throw new Error('Seed passed to ' + trellis.name + ' is a ' + (typeof seed) + ' when it should be an object.');
            if (!seed)
                throw new Error('Seed passed to ' + trellis.name + ' is null');
            this.seed = seed;
            this.trellis = trellis;
            this.main_table = this.trellis.get_table_name();
            this.ground = ground;
            this.db = ground.db;
        }
        Update.prototype.get_access_name = function () {
            return this.trellis + '.update';
        };
        Update.prototype.generate_sql = function (trellis) {
            var _this = this;
            var duplicate = '', primary_keys;
            var id = this.seed[trellis.primary_key];
            if (!id && id !== 0) {
                return this.create_record(trellis);
            }
            else {
                var table = trellis.get_root_table();
                if (table && table.primary_keys && table.primary_keys.length > 0)
                    primary_keys = table.primary_keys;
                else
                    primary_keys = [trellis.primary_key];
                var conditions = [];
                var ids = [];
                for (var i in primary_keys) {
                    var key = primary_keys[i];
                    ids[key] = this.seed[key];
                    // Note I'm not referencing key against all of the trellis properties because
                    // I'm assuming that the key is a part of the trellis core properties since
                    // it is a primary key.
                    var value = trellis.properties[key].get_sql_value(ids[key]);
                    conditions.push(key + ' = ' + value);
                }
                var condition_string = conditions.join(' AND ');
                if (!condition_string)
                    throw new Error('Conditions string cannot be empty.');
                var sql = 'SELECT ' + primary_keys.join(', ') + ' FROM `' + trellis.get_table_name() + '` WHERE ' + condition_string;
                return this.db.query_single(sql).then(function (id_result) {
                    if (!id_result)
                        return _this.create_record(trellis);
                    else
                        return _this.update_record(trellis, id, condition_string);
                });
            }
        };
        Update.prototype.update_embedded_seed = function (property, value) {
            var _this = this;
            var type_property = property.parent.type_property;
            var type = type_property ? value[type_property.name] : null;
            var other_trellis = value.trellis || type || property.other_trellis;
            return this.ground.update_object(other_trellis, value, this.user).then(function (entity) {
                //          var other_id = this.get_other_id(value);
                //          if (other_id !== null)
                //            value = other_id;
                //          else
                //            value = entity[trellis.primary_key];
                //
                //          var other_primary_property = this.other_trellis.properties[this.other_trellis.primary_key]
                //          return other_primary_property.get_field_value(value, as_service, update)
                _this.seed[property.name] = entity;
            });
        };
        Update.prototype.update_embedded_seeds = function (core_properties) {
            var promises = [];
            for (var name in core_properties) {
                var property = core_properties[name];
                var value = this.seed[property.name];
                if (property.type == 'reference' && value) {
                    if (typeof value === 'object')
                        promises.push(this.update_embedded_seed(property, value));
                }
            }
            return when.all(promises);
        };
        Update.prototype.create_record = function (trellis) {
            var _this = this;
            var fields = [];
            var values = [];
            var core_properties = trellis.get_core_properties();
            if (core_properties[trellis.primary_key].type == 'guid' && !this.seed[trellis.primary_key]) {
                this.seed[trellis.primary_key] = uuid.v1();
            }
            // Update any embedded seeds before the main update
            return this.update_embedded_seeds(core_properties).then(function () {
                var add_fields = function (properties, seed) {
                    for (var name in properties) {
                        var property = properties[name];
                        if (property.is_virtual)
                            continue;
                        var seed_name = property.get_seed_name();
                        if (seed[seed_name] === undefined && !_this.is_create_property(property))
                            continue;
                        var value = _this.get_field_value(property, seed);
                        fields.push('`' + property.get_field_name() + '`');
                        values.push(value);
                        var composite_properties = property.composite_properties;
                        var composite_seed = seed[seed_name];
                        if (composite_properties && composite_properties.length > 0 && typeof composite_seed === 'object') {
                            add_fields(composite_properties, composite_seed);
                        }
                    }
                };
                add_fields(core_properties, _this.seed);
                var field_string = fields.join(', ');
                var value_string = values.join(', ');
                var sql = 'INSERT INTO `' + trellis.get_table_name() + '` (' + field_string + ') VALUES (' + value_string + ");\n";
                if (_this.log_queries)
                    console.log(sql);
                return _this.db.query(sql).then(function (result) {
                    var id;
                    if (_this.seed[trellis.primary_key]) {
                        id = _this.seed[trellis.primary_key];
                    }
                    else {
                        id = result.insertId;
                        _this.seed[trellis.primary_key] = id;
                    }
                    return _this.update_links(trellis, id, true).then(function () {
                        return _this.ground.invoke(trellis.name + '.created', _this.seed, _this);
                    });
                });
            });
        };
        Update.prototype.update_record = function (trellis, id, key_condition) {
            var _this = this;
            var core_properties = MetaHub.filter(trellis.get_core_properties(), function (p) { return _this.is_update_property(p); });
            return this.update_embedded_seeds(core_properties).then(function () {
                var next = function () {
                    return _this.update_links(trellis, id).then(function () { return _this.ground.invoke(trellis.name + '.updated', _this.seed, _this); });
                };
                var updates = [];
                for (var name in core_properties) {
                    var property = core_properties[name];
                    if (_this.seed[property.name] === undefined) {
                        if (property.insert == 'trellis') {
                            _this.seed[property.name] = _this.trellis.name;
                        }
                        else
                            continue;
                    }
                    var field_string = '`' + property.get_field_name() + '`';
                    var value = _this.get_field_value(property, _this.seed);
                    updates.push(field_string + ' = ' + value);
                }
                // Check if there's nothing to add
                if (updates.length === 0)
                    return next();
                var sql = 'UPDATE `' + trellis.get_table_name() + "`\n" + 'SET ' + updates.join(', ') + "\n" + 'WHERE ' + key_condition + "\n;";
                if (_this.log_queries)
                    console.log(sql);
                return _this.db.query(sql).then(next);
            });
        };
        Update.prototype.apply_insert = function (property, value) {
            if (property.insert == 'trellis')
                return this.trellis.name;
            if (property.type == 'created' || property.type == 'modified')
                return Math.round(new Date().getTime() / 1000);
            if (!value && property.insert == 'author') {
                if (!this.user) {
                    throw new Error('Cannot insert author into ' + property.parent.name + '.' + property.name + ' because current user is not set.');
                }
                return this.user.id;
            }
            return value;
        };
        Update.prototype.is_create_property = function (property) {
            if (property.is_virtual)
                return false;
            // Ignore shared fields
            var field = property.get_field_override();
            if (field && field.share)
                return false;
            return property.insert == 'trellis' || property.type == 'created' || property.type == 'modified' || property.insert == 'author';
        };
        Update.prototype.get_field_value = function (property, seed) {
            var name = property.get_seed_name();
            var value = seed[name];
            value = this.apply_insert(property, value);
            seed[name] = value;
            return property.get_sql_value(value);
        };
        Update.prototype.is_update_property = function (property) {
            if (property.is_virtual)
                return false;
            // Ignore shared fields
            var field = property.get_field_override();
            if (field && field.share)
                return false;
            if (property.name == property.parent.primary_key || property.type == 'created' || property.insert == 'alter')
                return false;
            return this.seed[property.name] !== undefined || property.insert == 'trellis' || property.type == 'modified';
        };
        Update.prototype.update_links = function (trellis, id, create) {
            if (create === void 0) { create = false; }
            var links = trellis.get_links();
            var promises = [];
            for (var name in links) {
                var property = links[name];
                if (!create) {
                    if (property.is_readonly || property.is_private)
                        continue;
                }
                switch (property.get_relationship()) {
                    case 2 /* one_to_many */:
                        promises.push(this.update_one_to_many(property));
                        break;
                    case 3 /* many_to_many */:
                        promises.push(this.update_many_to_many(property, create));
                        break;
                }
            }
            return when.all(promises);
        };
        Update.prototype.update_many_to_many = function (property, create) {
            var _this = this;
            if (create === void 0) { create = false; }
            var list = this.seed[property.name];
            var row = this.seed;
            if (!MetaHub.is_array(list))
                return when.resolve();
            var join = mining.Link_Trellis.create_from_property(property);
            var other_trellis = property.get_referenced_trellis();
            var update = function (other) {
                var sql, other_id = other_trellis.get_id(other);
                // First updated the embedded list object into the database, then link it to the main seed.
                return _this.update_reference_object(other, property).then(function () {
                    // Clients can use the _remove flag to detach items from lists without deleting them
                    if (typeof other === 'object' && other._removed_) {
                        if (other_id !== null) {
                            var cross = new mining.Cross_Trellis(property);
                            cross['alias'] = null;
                            sql = cross.generate_delete(property, row, other);
                            if (_this.ground.log_updates)
                                console.log(sql);
                            return _this.ground.invoke(join.table_name + '.remove', row, property, other, join).then(function () { return _this.db.query(sql); }).then(function () { return _this.ground.invoke(join.table_name + '.removed', row, property, other, join); });
                        }
                    }
                    else {
                        if (other_id === null) {
                            other = _this.ground.update_object(other_trellis, other, _this.user).then(function (other) {
                                var cross = new mining.Cross_Trellis(property);
                                sql = cross.generate_insert(property, row, other);
                                if (_this.ground.log_updates)
                                    console.log(sql);
                                return _this.ground.invoke(join.table_name + '.create', row, property, other, join).then(function () { return _this.db.query(sql); }).then(function () { return _this.ground.invoke(join.table_name + '.created', row, property, other, join); });
                            });
                        }
                        else {
                            var cross = new mining.Cross_Trellis(property);
                            sql = cross.generate_insert(property, row, other);
                            if (_this.ground.log_updates)
                                console.log(sql);
                            return _this.ground.invoke(join.table_name + '.create', row, property, other, join).then(function () { return _this.db.query(sql); }).then(function () { return _this.ground.invoke(join.table_name + '.created', row, property, other, join); });
                        }
                    }
                });
            };
            return when.all(list.map(update));
        };
        Update.prototype.update_one_to_many = function (property) {
            var _this = this;
            var seed = this.seed;
            var list = seed[property.name];
            if (!MetaHub.is_array(list))
                return when.resolve();
            var promises = MetaHub.map_to_array(list, function (item) { return _this.update_reference_object(item, property); });
            return when.all(promises);
        };
        Update.prototype.update_reference = function (property, id) {
            var item = this.seed[property.name];
            if (!item)
                return when.resolve();
            return this.update_reference_object(item, property);
        };
        Update.prototype.update_reference_object = function (other, property) {
            if (typeof other !== 'object') {
                // Test if the value is a valid key.  An error will be thrown if it isn't
                property.get_sql_value(other);
                return when.resolve();
            }
            var trellis;
            if (other.trellis)
                trellis = other.trellis;
            else
                trellis = property.other_trellis;
            var other_property = property.get_other_property();
            if (other_property) {
                other[other_property.name] = this.seed[this.trellis.primary_key];
                if (other_property.composite_properties) {
                    for (var i = 0; i < other_property.composite_properties.length; ++i) {
                        var secondary = other_property.composite_properties[i];
                        other[secondary.name] = this.seed[secondary.get_other_property(true).name];
                    }
                }
            }
            return this.ground.update_object(trellis, other, this.user);
        };
        Update.prototype.run = function () {
            var _this = this;
            var pipeline = require('when/pipeline');
            if (this.log_queries) {
                var temp = new Error();
                this.run_stack = temp['stack'];
            }
            var tree = this.trellis.get_tree().filter(function (t) { return !t.is_virtual; });
            var invoke_promises = tree.map(function (trellis) { return function () { return _this.ground.invoke(trellis.name + '.update', _this.seed, _this); }; });
            invoke_promises = invoke_promises.concat(function () { return _this.ground.invoke('*.update', _this.seed, _this); });
            return pipeline(invoke_promises).then(function () {
                var promises = tree.map(function (trellis) { return function () { return _this.generate_sql(trellis); }; });
                return pipeline(promises).then(function () {
                    return _this.seed;
                });
            });
        };
        return Update;
    })();
    Ground.Update = Update;
})(Ground || (Ground = {}));
/// <reference path="../Core.ts"/>
var Ground;
(function (Ground) {
    var Delete = (function () {
        function Delete(ground, trellis, seed) {
            this.max_depth = 20;
            this.ground = ground;
            this.trellis = trellis;
            this.seed = seed;
        }
        Delete.prototype.get_access_name = function () {
            return this.trellis + '.delete';
        };
        Delete.prototype.delete_child = function (link, id, depth) {
            var _this = this;
            if (depth === void 0) { depth = 0; }
            var other_property = link.get_other_property();
            var other_trellis = other_property.parent;
            var query = this.ground.create_query(other_trellis.name);
            query.add_filter(other_property.name, id);
            console.log('id', id);
            return query.run(null, this.ground.miner).then(function (result) { return when.all(result.objects.map(function (object) { return _this.run_delete(other_trellis, object, depth + 1); })); });
        };
        Delete.prototype.delete_children = function (trellis, id, depth) {
            var _this = this;
            if (depth === void 0) { depth = 0; }
            var links = this.get_child_links(trellis);
            return when.all(links.map(function (link) { return _this.delete_child(link, id, depth); }));
        };
        Delete.prototype.delete_record = function (trellis, seed) {
            var keys = trellis.get_primary_keys();
            var filters = keys.map(function (property) {
                var id = seed[property.name];
                if (id === undefined || id === null)
                    throw new Error("Cannot delete entity. Entity is missing " + property.fullname() + ".");
                return property.query() + " = " + property.get_sql_value(id);
            });
            //var id_sql = trellis.properties[trellis.primary_key].get_sql_value(id)
            //      var primary_property = trellis.properties[trellis.primary_key]
            var sql = 'DELETE FROM `' + trellis.get_table_name() + '`' + "\nWHERE " + filters.join(' AND ');
            //+ "\nWHERE " + trellis.query_primary_key() + ' = ' + id_sql
            if (this.ground.log_updates)
                console.log(sql);
            return this.ground.db.query(sql);
        };
        Delete.prototype.get_child_links = function (trellis) {
            var result = [], links = trellis.get_links();
            for (var i in links) {
                var link = links[i];
                var other = link.get_other_property();
                // The other trellis may not have a reciprocal property
                if (other)
                    console.log('child', other.fullname(), other.is_parent);
                if (other && (other.name == 'parent' || other.is_parent)) {
                    console.log('child-to-delete', link.fullname());
                    result.push(link);
                }
            }
            return result;
        };
        Delete.prototype.run = function (depth) {
            if (depth === void 0) { depth = 0; }
            var trellis = this.trellis;
            var seed = this.seed;
            return this.run_delete(trellis, seed, depth);
        };
        Delete.prototype.run_delete = function (trellis, seed, depth) {
            var _this = this;
            if (depth === void 0) { depth = 0; }
            if (depth > this.max_depth)
                throw new Error("Max depth of " + this.max_depth + " exceeded.  Possible infinite loop.");
            var pipeline = require('when/pipeline');
            var id = seed[trellis.primary_key];
            console.log('deleting', id);
            if (id === null || id === undefined)
                throw new Error("Object was tagged to be deleted but has no identity.");
            var property_names = MetaHub.map_to_array(trellis.get_all_properties(), function (x) { return x.name; });
            return this.ground.assure_properties(trellis, seed, property_names).then(function (seed) {
                var tree = trellis.get_tree().filter(function (t) { return !t.is_virtual; });
                var invoke_promises = tree.map(function (trellis) { return _this.ground.invoke(trellis.name + '.delete', seed); });
                return pipeline([
                    function () { return when.all(invoke_promises); },
                    function () { return _this.delete_children(trellis, id, depth); },
                    function () { return when.all(tree.map(function (trellis) { return _this.delete_record(trellis, seed); })); },
                    function () { return when.all(tree.map(function (trellis) { return _this.ground.invoke(trellis.name + '.deleted', seed); })); },
                    function () { return []; }
                ]);
            });
        };
        return Delete;
    })();
    Ground.Delete = Delete;
})(Ground || (Ground = {}));
/// <reference path="../../../vineyard-metahub/metahub.d.ts"/>
/// <reference path="../../dist/db.d.ts"/>
/// <reference path="operations/Update.ts"/>
/// <reference path="operations/Delete.ts"/>
/// <reference path="../../defs/node.d.ts"/>
/// <reference path="../../dist/landscape.d.ts"/>
/// <reference path="../../dist/mining.d.ts"/>
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var MetaHub = require('vineyard-metahub')
var Database = require('./db')
var landscape = require('./landscape')
var mining = require('./mining')
var Ground;
(function (Ground) {
    Ground.path_to_array = mining.path_to_array;
    var Core = (function (_super) {
        __extends(Core, _super);
        function Core(config, db_name) {
            _super.call(this);
            this.log_queries = false;
            this.log_updates = false;
            this.query_schema = Core.load_relative_json_file('../validation/query.json');
            this.update_schema = Core.load_relative_json_file('../validation/update.json');
            this.db = new Database(config, db_name);
            var filename = Core.load_relative_json_file('../property_types.json');
            this.schema = new landscape.Schema();
            this.schema.load_property_types(filename);
            this.miner = new mining.Miner(this.schema, this.db, this);
        }
        Core.load_relative_json_file = function (path) {
            var Path = require('path');
            var fs = require('fs');
            return JSON.parse(fs.readFileSync(Path.resolve(__dirname, path), 'ascii'));
        };
        Core.prototype.get_identity = function (trellis, seed) {
            return this.get_trellis(trellis).get_identity2(seed);
        };
        Core.prototype.get_trellis = function (trellis) {
            return this.schema.get_trellis(trellis);
        };
        Core.prototype.create_remaining_tables = function () {
            var schema = this.schema;
            for (var i in schema.trellises) {
                var trellis = schema.trellises[i];
                if (schema.tables[trellis.name])
                    continue;
                var table = landscape.Table.create_from_trellis(trellis, this.schema);
                schema.tables[i] = table;
            }
        };
        Core.prototype.create_missing_table_links = function () {
            var schema = this.schema;
            for (var i in schema.trellises) {
                var trellis = schema.trellises[i];
                var table = schema.tables[trellis.name];
                var links = trellis.get_all_links();
                for (var p in links) {
                    if (!table.links[p])
                        table.create_link(links[p]);
                }
            }
        };
        Core.prototype.create_query = function (trellis_name) {
            var trellis = this.get_trellis(trellis_name);
            return new mining.Query_Builder(trellis, this.schema);
        };
        Core.prototype.create_update = function (trellis, seed, user) {
            if (seed === void 0) { seed = {}; }
            if (user === void 0) { user = null; }
            trellis = this.sanitize_trellis_argument(trellis);
            // If _deleted is an object then it is a list of links
            // to delete which will be handled by Update.
            // If _delete is simply true then the seed itself is marked for deletion.
            if (seed._deleted === true || seed._deleted === 'true' || seed._deleted_ === true || seed._deleted_ === 'true' || seed.__deleted__ === true || seed.__deleted__ === 1)
                return new Ground.Delete(this, trellis, seed);
            var update = new Ground.Update(trellis, seed, this);
            update.user = user;
            update.log_queries = this.log_updates;
            return update;
        };
        Core.prototype.delete_object = function (trellis, seed) {
            var trellis = this.sanitize_trellis_argument(trellis);
            var del = new Ground.Delete(this, trellis, seed);
            return del.run();
        };
        Core.prototype.insert_object = function (trellis, seed, user, as_service) {
            if (seed === void 0) { seed = {}; }
            if (user === void 0) { user = null; }
            if (as_service === void 0) { as_service = false; }
            return this.update_object(trellis, seed, user, as_service);
        };
        Core.is_private = function (property) {
            return property.is_private;
        };
        Core.is_private_or_readonly = function (property) {
            return property.is_private || property.is_readonly;
        };
        Core.prototype.update_object = function (trellis, seed, user, as_service) {
            if (seed === void 0) { seed = {}; }
            if (user === void 0) { user = null; }
            if (as_service === void 0) { as_service = false; }
            trellis = this.sanitize_trellis_argument(trellis);
            // If _deleted is an object then it is a list of links
            // to delete which will be handled by Update.
            // If _delete is simply true then the seed itself is marked for deletion.
            if (seed._deleted === true || seed._deleted === 'true' || seed._deleted_ === true || seed._deleted_ === 'true' || seed.__deleted__ === true || seed.__deleted__ === 1)
                return this.delete_object(trellis, seed);
            var update = new Ground.Update(trellis, seed, this);
            update.user = user;
            update.log_queries = this.log_updates;
            //      this.invoke(trellis.name + '.update', seed, trellis);
            return update.run();
        };
        Core.load_json_from_file = function (filename) {
            var fs = require('fs');
            var json = fs.readFileSync(filename, 'ascii');
            if (!json)
                throw new Error('Could not find file: ' + filename);
            return JSON.parse(json);
        };
        //    load_metahub_file(filename:string) {
        //      var fs = require('fs')
        //      var code = fs.readFileSync(filename, { encoding: 'ascii' })
        //      var match = this.hub.parse_code(code)
        //      var block = match.get_data()
        //
        ////      console.log('data', require('util').inspect(block.expressions, true, 10))
        //      Logic.load2(this, block.expressions)
        //    }
        Core.prototype.load_schema_from_file = function (filename) {
            var data = Core.load_json_from_file(filename);
            this.schema.parse_schema(data, this);
            this.create_remaining_tables();
            this.create_missing_table_links();
        };
        Core.prototype.load_tables = function (tables) {
            var schema = this.schema;
            for (var name in tables) {
                var table = new landscape.Table(name, schema);
                table.load_from_schema(tables[name]);
                schema.tables[name] = table;
                schema.custom_tables[name] = table;
            }
        };
        Core.remove_fields = function (object, trellis, filter) {
            for (var key in object) {
                var property = trellis.properties[key];
                if (property && filter(property))
                    delete object[key];
            }
            return object;
        };
        // Deprecated in favor of get_trellis()
        Core.prototype.sanitize_trellis_argument = function (trellis) {
            return this.get_trellis(trellis);
        };
        Core.prototype.stop = function () {
            this.db.close();
        };
        Core.prototype.export_schema = function () {
            return {
                trellises: MetaHub.map(this.schema.trellises, function (trellis) { return trellis.export_schema(); })
            };
        };
        Core.perspective = function (seed, trellis, property) {
            if (trellis === property.parent) {
                return seed;
            }
            else {
                var result = {};
                var other_property = property.get_other_property();
                var identity = seed[other_property.name];
                var reference = seed[other_property.parent.primary_key];
                if (other_property.type == 'list') {
                    result[property.parent.primary_key] = identity[0];
                    result[other_property.name] = [reference];
                }
                else {
                    result[property.parent.primary_key] = identity;
                    result[other_property.name] = reference;
                }
                return result;
            }
        };
        Core.prototype.create_table = function (trellis) {
            if (!trellis)
                throw new Error('Empty object was passed to create_table().');
            var table = landscape.Table.create_from_trellis(trellis, this.schema);
            var sql = table.create_sql_from_trellis(trellis);
            return this.db.query(sql).then(function () { return table; });
        };
        Core.prototype.create_trellis_tables = function (trellises) {
            var _this = this;
            var promises = MetaHub.map_to_array(trellises, function (trellis) { return _this.create_table(trellis); });
            return when.all(promises);
        };
        Core.prototype.assure_properties = function (trellis, seed, required_properties) {
            if (trellis.seed_has_properties(seed, required_properties))
                return when.resolve(seed);
            var properties = [], expansions = [];
            for (var i = 0; i < required_properties.length; ++i) {
                var property = required_properties[i];
                if (property.indexOf('.') == -1) {
                    properties.push(property);
                }
                else {
                    var tokens = property.split('.');
                    expansions.push(tokens.slice(0, -1).join('/'));
                    properties.push(tokens[0]);
                }
            }
            var query = this.create_query(trellis.name);
            query.add_key_filter(trellis.get_identity2(seed));
            query.extend({
                properties: properties
            });
            query.add_expansions(expansions);
            return query.run_single(null, this.miner);
        };
        return Core;
    })(MetaHub.Meta_Object);
    Ground.Core = Core;
})(Ground || (Ground = {}));
module.exports = Ground;
//# sourceMappingURL=ground.js.map