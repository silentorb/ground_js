/**
* User: Chris Johnson
* Date: 9/23/13
*/
/// <reference path="../references.ts"/>
var Ground;
(function (Ground) {
    var Update = (function () {
        function Update(trellis, seed, ground) {
            if (typeof ground === "undefined") { ground = null; }
            this.override = true;
            this.main_table = 'node';
            this.is_service = false;
            this.seed = seed;
            this.trellis = trellis;
            this.main_table = this.trellis.get_table_name();
            this.ground = ground || this.trellis.ground;
            this.db = ground.db;
        }
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
                for (var key in primary_keys) {
                    ids[key] = this.seed[key];
                    conditions.push(key + ' = ' + trellis.properties[key].get_field_value(ids[key]));
                }
                var condition_string = conditions.join(' AND ');
                if (!condition_string)
                    throw new Error('Conditions string cannot be empty.');

                var sql = 'SELECT ' + primary_keys.join(', ') + ' FROM ' + trellis.get_table_name() + ' WHERE ' + condition_string;

                return this.db.query(sql).then(function (id_result) {
                    if (!id_result)
                        return _this.create_record(trellis);
else
                        return _this.update_record(trellis, id, condition_string);
                });
            }
        };

        Update.prototype.create_record = function (trellis) {
            var _this = this;
            var fields = [];
            var values = [];
            var core_properties = MetaHub.filter(trellis.get_core_properties(), this.is_create_property);
            var promises = [];
            for (var name in core_properties) {
                var property = core_properties[name];
                if (this.seed[property.name] !== undefined) {
                    fields.push('`' + property.get_field_name() + '`');
                    var field_promise = this.get_field_value(property).then(function (value) {
                        if (value.length == 0) {
                            throw new Error('Field value was empty for inserting ' + property.name + ' in ' + trellis.name + '.');
                        }

                        values.push(value);
                    });

                    promises.push(field_promise);
                }
            }

            return when.all(promises).then(function () {
                var field_string = fields.join(', ');
                var value_string = values.join(', ');
                var sql = 'INSERT INTO ' + trellis.get_table_name() + ' (' + field_string + ') VALUES (' + value_string + ");\n";
                if (Update.log_queries)
                    console.log(sql);

                return _this.db.query(sql).then(function (err, result) {
                    var id;
                    if (_this.seed[trellis.primary_key]) {
                        id = _this.seed[trellis.primary_key];
                    } else {
                        id = result.insertId;
                        _this.seed[trellis.primary_key] = id;
                    }

                    return _this.update_links(trellis, id, true).then(function () {
                        return _this.ground.invoke(trellis.name + '.create', _this.seed, trellis);
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
                    promises.push(this.get_field_value(property).then(function (value) {
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

                if (Update.log_queries)
                    console.log(sql);

                return _this.db.query(sql).then(next);
            });
        };

        Update.prototype.apply_insert = function (property, value) {
            if (property.insert == 'trellis')
                return this.trellis.name;

            if (property.type == 'created' || property.type == 'modified')
                return Math.round(new Date().getTime() / 1000).toString();

            if (!value && property.insert == 'author') {
                throw new Error('Inserting author not yet supported');
            }

            return value.toString();
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

        Update.prototype.get_field_value = function (property) {
            var value = this.seed[property.name];
            value = this.apply_insert(property, value);
            this.seed[property.name] = value;

            return property.get_field_value(value, this.is_service);
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
                if (this.is_service && !create) {
                    if (property.is_readonly || property.is_private)
                        continue;
                }

                switch (property.get_relationship()) {
                    case Ground.Relationships.one_to_many:
                        promises.push(this.update_one_to_many(property, id));
                        break;
                    case Ground.Relationships.many_to_many:
                        promises.push(this.update_many_to_many(property, id, create));
                        break;
                }
            }

            return when.all(promises);
        };

        Update.prototype.update_many_to_many = function (property, id, create) {
            if (typeof create === "undefined") { create = false; }
            var list = this.seed[property.name];
            if (!MetaHub.is_array(list))
                return when.resolve();

            throw new Error('Not yet implemented');
        };

        Update.prototype.update_one_to_many = function (property, id) {
            var _this = this;
            var seed = this.seed;
            var list = seed[property.name];
            if (!MetaHub.is_array(list))
                return when.resolve();

            var promises = MetaHub.map_to_array(list, function (item) {
                return _this.update_reference_object(item, property, id);
            });

            return when.all(promises);
        };

        Update.prototype.update_reference = function (property, id) {
            var item = this.seed[property.name];
            if (!item)
                return when.resolve();

            return this.update_reference_object(item, property, id);
        };

        Update.prototype.update_reference_object = function (object, property, id) {
            var trellis;
            if (object.trellis)
                trellis = object.trellis;
else
                trellis = property.other_trellis;

            var other_property = property.get_other_property();
            if (other_property && object[other_property.name] !== undefined)
                object[other_property.name] = id;

            return this.ground.update_object(trellis, object);
        };

        Update.prototype.run = function () {
            var _this = this;
            var tree = this.trellis.get_tree().filter(function (t) {
                return !t.is_virtual;
            });

            var promises = tree.map(function (trellis) {
                return _this.generate_sql(trellis);
            });

            return when.all(promises).then(function () {
                return _this.seed;
            });
        };
        Update.log_queries = false;
        return Update;
    })();
    Ground.Update = Update;
})(Ground || (Ground = {}));
//# sourceMappingURL=Update.js.map
