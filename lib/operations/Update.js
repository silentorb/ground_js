/**
* User: Chris Johnson
* Date: 9/23/13
*/
/// <reference path="../references.ts"/>
var uuid = require('node-uuid');

var Ground;
(function (Ground) {
    var Update = (function () {
        function Update(trellis, seed, ground) {
            if (typeof ground === "undefined") { ground = null; }
            this.override = true;
            this.main_table = 'node';
            this.log_queries = false;
            this.seed = seed;
            this.trellis = trellis;
            this.main_table = this.trellis.get_table_name();
            this.ground = ground || this.trellis.ground;
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
            } else {
                var table = this.ground.tables[trellis.name];
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
                    conditions.push(key + ' = ' + trellis.properties[key].get_sql_value(ids[key]));
                }
                var condition_string = conditions.join(' AND ');
                if (!condition_string)
                    throw new Error('Conditions string cannot be empty.');

                var sql = 'SELECT ' + primary_keys.join(', ') + ' FROM ' + trellis.get_table_name() + ' WHERE ' + condition_string;

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
            return this.ground.update_object(property.other_trellis, value, this.user).then(function (entity) {
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

        Update.prototype.create_record = function (trellis) {
            var _this = this;
            var fields = [];
            var values = [];
            var core_properties = trellis.get_core_properties();
            var promises = [];

            if (core_properties[trellis.primary_key].type == 'guid' && !this.seed[trellis.primary_key]) {
                this.seed[trellis.primary_key] = uuid.v1();
            }

            for (var name in core_properties) {
                var property = core_properties[name];
                var value = this.seed[property.name];
                if (property.type == 'reference' && value && typeof value === 'object') {
                    promises.push(this.update_embedded_seed(property, value));
                }
            }

            return when.all(promises).then(function () {
                var add_fields = function (properties, seed) {
                    for (var name in properties) {
                        var property = properties[name];
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
                var sql = 'INSERT INTO ' + trellis.get_table_name() + ' (' + field_string + ') VALUES (' + value_string + ");\n";
                if (_this.log_queries)
                    console.log(sql);

                return _this.db.query(sql).then(function (result) {
                    var id;
                    if (_this.seed[trellis.primary_key]) {
                        id = _this.seed[trellis.primary_key];
                    } else {
                        id = result.insertId;
                        _this.seed[trellis.primary_key] = id;
                    }

                    return _this.update_links(trellis, id, true).then(function () {
                        return _this.ground.invoke(trellis.name + '.created', _this.seed, trellis);
                    });
                });
            });
        };

        Update.prototype.update_record = function (trellis, id, key_condition) {
            var _this = this;
            var updates = [];
            var promises = [];
            var core_properties = MetaHub.filter(trellis.get_core_properties(), this.is_update_property);
            for (var name in core_properties) {
                var property = core_properties[name];
                if (this.seed[property.name] !== undefined) {
                    var field_string = '`' + property.get_field_name() + '`';
                    promises.push(this.get_field_value(property, this.seed).then(function (value) {
                        updates.push(field_string + ' = ' + value);
                    }));
                }
            }

            return when.all(promises).then(function () {
                var next = function () {
                    return _this.update_links(trellis, id).then(function () {
                        return _this.ground.invoke(trellis.name + '.updated', _this.seed, trellis);
                    });
                };

                if (updates.length === 0)
                    return next();

                var sql = 'UPDATE ' + trellis.get_table_name() + "\n" + 'SET ' + updates.join(', ') + "\n" + 'WHERE ' + key_condition + "\n;";

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
                if (!this.user)
                    throw new Error('Cannot insert author into ' + property.parent.name + '.' + property.name + ' because current user is not set.');

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
            if (typeof create === "undefined") { create = false; }
            var links = trellis.get_links();
            var promises = [];
            for (var name in links) {
                var property = links[name];
                if (!create) {
                    if (property.is_readonly || property.is_private)
                        continue;
                }

                switch (property.get_relationship()) {
                    case Ground.Relationships.one_to_many:
                        promises.push(this.update_one_to_many(property));
                        break;
                    case Ground.Relationships.many_to_many:
                        promises.push(this.update_many_to_many(property, create));
                        break;
                }
            }

            return when.all(promises);
        };

        Update.prototype.update_many_to_many = function (property, create) {
            if (typeof create === "undefined") { create = false; }
            var _this = this;
            var list = this.seed[property.name];
            var row = this.seed;
            if (!MetaHub.is_array(list))
                return when.resolve();

            var join = Ground.Link_Trellis.create_from_property(property);
            var other_trellis = property.get_referenced_trellis();

            var update = function (other) {
                var sql, other_id = other_trellis.get_id(other);

                // First updated the embedded list object into the database, then link it to the main seed.
                return _this.update_reference_object(other, property).then(function () {
                    if (typeof other === 'object' && other._remove) {
                        if (other_id !== null) {
                            sql = join.generate_delete_row([row, other]);
                            if (_this.log_queries)
                                console.log(sql);

                            return _this.ground.invoke(join.table_name + '.delete', property, row, other, join).then(function () {
                                return _this.db.query(sql);
                            });
                        }
                    } else {
                        if (other_id === null) {
                            other = _this.ground.update_object(other_trellis, other, _this.user).then(function (other) {
                                var seeds = {};
                                seeds[_this.trellis.name] = row;
                                seeds[other_trellis.name] = other;
                                sql = join.generate_insert(seeds);
                                if (_this.log_queries)
                                    console.log(sql);

                                return _this.db.query(sql).then(function () {
                                    return _this.ground.invoke(join.table_name + '.create', property, row, other, join);
                                });
                            });
                        } else {
                            var seeds = {};
                            seeds[_this.trellis.name] = row;
                            seeds[other_trellis.name] = other;
                            sql = join.generate_insert(seeds);
                            if (_this.log_queries)
                                console.log(sql);

                            return _this.db.query(sql).then(function () {
                                return _this.ground.invoke(join.table_name + '.create', property, row, other, join);
                            });
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

            var promises = MetaHub.map_to_array(list, function (item) {
                return _this.update_reference_object(item, property);
            });

            return when.all(promises);
        };

        Update.prototype.update_reference = function (property, id) {
            var item = this.seed[property.name];
            if (!item)
                return when.resolve();

            return this.update_reference_object(item, property);
        };

        Update.prototype.update_reference_object = function (other, property) {
            if (typeof other !== 'object')
                return when.resolve();

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
                        other[secondary.name] = this.seed[secondary.get_other_property().name];
                    }
                }
            }

            return this.ground.update_object(trellis, other, this.user);
        };

        Update.prototype.run = function () {
            var _this = this;
            var tree = this.trellis.get_tree().filter(function (t) {
                return !t.is_virtual;
            });
            var invoke_promises = tree.map(function (trellis) {
                return _this.ground.invoke(trellis.name + '.update', _this, trellis);
            });

            return when.all(invoke_promises).then(function () {
                var promises = tree.map(function (trellis) {
                    return _this.generate_sql(trellis);
                });
                return when.all(promises).then(function () {
                    return _this.seed;
                });
            });
        };
        return Update;
    })();
    Ground.Update = Update;
})(Ground || (Ground = {}));
//# sourceMappingURL=Update.js.map
