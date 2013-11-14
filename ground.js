var MetaHub = require('metahub');var when = require('when');

var Ground;
(function (Ground) {
    var Database = (function () {
        function Database(settings, database) {
            this.log_queries = false;
            this.settings = settings;
            this.database = database;
        }
        Database.prototype.add_table_to_database = function (table, ground) {
            var sql = table.create_sql(ground);
            return this.query(sql).then(function () {
                return table;
            });
        };

        Database.prototype.add_non_trellis_tables_to_database = function (tables, ground) {
            var _this = this;
            var non_trellises = MetaHub.filter(tables, function (x) {
                return !x.trellis;
            });

            var promises = MetaHub.map_to_array(non_trellises, function (table) {
                return _this.add_table_to_database(table, ground);
            });
            return when.all(promises);
        };

        Database.prototype.create_table = function (trellis) {
            if (!trellis)
                throw new Error('Empty object was passed to create_table().');

            var table = Ground.Table.create_from_trellis(trellis);
            var sql = table.create_sql_from_trellis(trellis);
            return this.query(sql).then(function () {
                return table;
            });
        };

        Database.prototype.create_trellis_tables = function (trellises) {
            var _this = this;
            var promises = MetaHub.map_to_array(trellises, function (trellis) {
                return _this.create_table(trellis);
            });
            return when.all(promises);
        };

        Database.prototype.drop_all_tables = function () {
            var _this = this;
            return when.map(this.get_tables(), function (table) {
                return _this.query('DROP TABLE IF EXISTS `' + table + '`');
            });
        };

        Database.prototype.get_tables = function () {
            return when.map(this.query('SHOW TABLES'), function (row) {
                for (var i in row)
                    return row[i];

                return null;
            });
        };

        Database.prototype.query = function (sql, args) {
            if (typeof args === "undefined") { args = undefined; }
            var connection, def = when.defer();
            var mysql = require('mysql');
            connection = mysql.createConnection(this.settings[this.database]);
            connection.connect();
            if (this.log_queries)
                console.log('start', sql);

            connection.query(sql, args, function (err, rows, fields) {
                if (err) {
                    console.log('error', sql);
                    throw err;
                }

                def.resolve(rows, fields);

                return null;
            });
            connection.end();

            return def.promise;
        };

        Database.prototype.query_single = function (sql, args) {
            if (typeof args === "undefined") { args = undefined; }
            return this.query(sql, args).then(function (rows) {
                return rows[0];
            });
        };
        return Database;
    })();
    Ground.Database = Database;
})(Ground || (Ground = {}));
var Ground;
(function (Ground) {
    var Trellis = (function () {
        function Trellis(name, ground) {
            this.plural = null;
            this.parent = null;
            this.table = null;
            this.name = null;
            this.primary_key = 'id';
            this.properties = {};
            this.all_properties = {};
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
                this.properties[this.primary_key] = new Ground.Property(this.primary_key, property.get_data(), this);
            }
        };

        Trellis.prototype.clone_property = function (property_name, target_trellis) {
            if (this.properties[property_name] === undefined)
                throw new Error(this.name + ' does not have a property named ' + property_name + '.');

            target_trellis.add_property(property_name, this.properties[property_name]);
        };

        Trellis.prototype.get_all_links = function (filter) {
            if (typeof filter === "undefined") { filter = null; }
            var result = {};
            var properties = this.get_all_properties();
            for (var name in properties) {
                var property = properties[name];
                if (property.other_trellis && (!filter || filter(property)))
                    result[property.name] = property;
            }

            return result;
        };

        Trellis.prototype.get_all_properties = function () {
            var result = {};
            var tree = this.get_tree();
            for (var i = 0; i < tree.length; ++i) {
                var trellis = tree[i];
                for (var name in trellis.properties) {
                    var property = trellis.properties[name];
                    result[property.name] = property;
                }
            }
            return result;
        };

        Trellis.prototype.get_core_properties = function () {
            var result = {};
            for (var i in this.properties) {
                var property = this.properties[i];
                if (property.type != 'list')
                    result[i] = property;
            }

            return result;
        };

        Trellis.prototype.get_id = function (source) {
            if (source && typeof source === 'object')
                return source[this.primary_key];

            return source;
        };

        Trellis.prototype.get_join = function (main_table) {
            if (!this.parent)
                return null;

            return 'JOIN  ' + this.parent.get_table_query() + ' ON ' + this.parent.query_primary_key() + ' = ' + main_table + '.' + this.properties[this.primary_key].get_field_name();
        };

        Trellis.prototype.get_links = function () {
            var result = [];
            for (var name in this.properties) {
                var property = this.properties[name];
                if (property.other_trellis)
                    result.push(property);
            }
            return result;
        };

        Trellis.prototype.get_plural = function () {
            return this.plural || this.name + 's';
        };

        Trellis.prototype.get_primary_keys = function () {
            if (this.table && this.table.primary_keys) {
                var result = [];
                for (var i in this.table.primary_keys) {
                    var key = this.table.primary_keys[i];
                    result.push(this.properties[key]);
                }
                return result;
            }

            return [this.properties[this.primary_key]];
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

        Trellis.prototype.get_table_query = function () {
            if (this.table && this.table.query)
                return this.table.query;

            return this.get_table_name();
        };

        Trellis.prototype.get_tree = function () {
            var trellis = this;
            var tree = [];

            do {
                tree.unshift(trellis);
            } while(trellis = trellis.parent);

            return tree;
        };

        Trellis.prototype.initialize = function (all) {
            if (typeof this.parent === 'string') {
                if (!all[this.parent])
                    throw new Error(this.name + ' references a parent that does not exist: ' + this.parent + '.');

                this.set_parent(all[this.parent]);
                this.check_primary_key();
            }

            for (var j in this.properties) {
                var property = this.properties[j];
                if (property.other_trellis_name) {
                    var other_trellis = property.other_trellis = all[property.other_trellis_name];
                    if (!other_trellis)
                        throw new Error('Cannot find referenced trellis for ' + this.name + '.' + property.name + ': ' + property.other_trellis_name + '.');

                    property.initialize_composite_reference(other_trellis);
                }
            }
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

        Trellis.prototype.query_primary_key = function () {
            return this.get_table_name() + '.' + this.properties[this.primary_key].get_field_name();
        };

        Trellis.prototype.sanitize_property = function (property) {
            if (typeof property === 'string') {
                var properties = this.get_all_properties();
                if (properties[property] === undefined)
                    throw new Error(this.name + ' does not contain a property named ' + property + '.');

                return properties[property];
            }

            return property;
        };

        Trellis.prototype.set_parent = function (parent) {
            this.parent = parent;

            if (!parent.primary_key)
                throw new Error(parent.name + ' needs a primary key when being inherited by ' + this.name + '.');

            var keys;

            if (parent.table && parent.table.primary_keys) {
                keys = parent.table.primary_keys;
                if (!this.table)
                    this.table = Ground.Table.create_from_trellis(this);

                this.table.primary_keys = keys;
            } else {
                keys = [parent.primary_key];
            }

            for (var i = 0; i < keys.length; ++i) {
                parent.clone_property(keys[i], this);
            }
            this.primary_key = parent.primary_key;
        };
        return Trellis;
    })();
    Ground.Trellis = Trellis;
})(Ground || (Ground = {}));
var Ground;
(function (Ground) {
    var Query = (function () {
        function Query(trellis, base_path) {
            if (typeof base_path === "undefined") { base_path = null; }
            this.joins = [];
            this.filters = [];
            this.property_filters = {};
            this.post_clauses = [];
            this.include_links = true;
            this.fields = [];
            this.arguments = {};
            this.expansions = [];
            this.wrappers = [];
            this.links = [];
            this.trellis = trellis;
            this.ground = trellis.ground;
            this.db = this.ground.db;
            this.main_table = trellis.get_table_name();
            if (base_path)
                this.base_path = base_path;
else
                this.base_path = this.trellis.name;
        }
        Query.prototype.add_arguments = function (args) {
            for (var a in args) {
                this.arguments[a] = args[a];
            }
        };

        Query.prototype.add_filter = function (clause, arguments) {
            if (typeof arguments === "undefined") { arguments = null; }
            this.filters.push(clause);
            if (arguments)
                this.add_arguments(arguments);
        };

        Query.prototype.add_property_filter = function (property, value, operator) {
            if (typeof value === "undefined") { value = null; }
            if (typeof operator === "undefined") { operator = '='; }
            if (Query.operators.indexOf(operator) === -1)
                throw new Error("Invalid operator: '" + operator + "'.");

            this.property_filters[property] = {
                property: property,
                value: value,
                operator: operator
            };
        };

        Query.prototype.add_key_filter = function (value) {
            this.filters.push(this.trellis.query_primary_key() + ' = :primary_key');
            this.add_arguments({ ':primary_key': value });
        };

        Query.prototype.add_field = function (clause, arguments) {
            if (typeof arguments === "undefined") { arguments = null; }
            this.fields.push(clause);
            if (arguments) {
                this.add_arguments(arguments);
            }
        };

        Query.prototype.add_join = function (clause, arguments) {
            if (typeof arguments === "undefined") { arguments = null; }
            this.joins.push(clause);
            if (arguments) {
                this.add_arguments(arguments);
            }
        };

        Query.prototype.add_post = function (clause, arguments) {
            if (typeof arguments === "undefined") { arguments = null; }
            this.post_clauses.push(clause);
            if (arguments) {
                this.add_arguments(arguments);
            }
        };

        Query.prototype.add_expansion = function (clause) {
            this.expansions.push(clause);
        };

        Query.prototype.add_link = function (property) {
            property = this.trellis.sanitize_property(property);
            if (this.links[property.name])
                throw new Error(property.name + ' added twice to query.');

            var link = {
                other: property.get_referenced_trellis(),
                property: property
            };

            this.links[property.name] = link;
        };

        Query.prototype.add_sort = function (sort) {
            if (!this.trellis.properties[sort.property])
                throw new Error(this.trellis.name + ' does not contain sort property: ' + sort.property);

            var sql = this.trellis.properties[sort.property].name;

            if (typeof sort.dir === 'string') {
                var dir = sort.dir.toUpperCase();
                if (dir == 'ASC')
                    sql += ' ASC';
else if (dir == 'DESC')
                    sql += ' DESC';
            }

            return sql;
        };

        Query.prototype.add_wrapper = function (wrapper) {
            this.wrappers.push(wrapper);
        };

        Query.prototype.generate_pager = function (offset, limit) {
            if (typeof offset === "undefined") { offset = 0; }
            if (typeof limit === "undefined") { limit = 0; }
            offset = Math.round(offset);
            limit = Math.round(limit);
            if (!offset) {
                if (!limit)
                    return '';
else
                    return ' LIMIT ' + limit;
            } else {
                if (!limit)
                    limit = 18446744073709551615;

                return ' LIMIT ' + offset + ', ' + limit;
            }
        };

        Query.prototype.generate_sql = function (properties) {
            var data = this.get_fields_and_joins(properties);
            var data2 = this.process_property_filters();
            var fields = data.fields.concat(this.fields);
            var joins = data.joins.concat(this.joins, data2.joins);
            var args = MetaHub.concat(this.arguments, data2.arguments);
            var filters = this.filters.concat(data2.filters);

            if (fields.length == 0)
                throw new Error('No authorized fields found for trellis ' + this.main_table + '.');

            var sql = 'SELECT ';
            sql += fields.join(",\n");
            sql += "\nFROM " + this.main_table;
            if (joins.length > 0)
                sql += "\n" + joins.join("\n");

            if (this.filters.length > 0)
                sql += "\nWHERE " + this.filters.join(" AND ");

            if (this.post_clauses.length > 0)
                sql += " " + this.post_clauses.join(" ");

            for (var pattern in args) {
                var value = args[pattern];
                sql = sql.replace(new RegExp(pattern), Ground.Property.get_field_value_sync(value));
            }

            for (var i = 0; i < this.wrappers.length; ++i) {
                var wrapper = this.wrappers[i];
                sql = wrapper.start + sql + wrapper.end;
            }
            return sql;
        };

        Query.prototype.get_fields_and_joins = function (properties, include_primary_key) {
            if (typeof include_primary_key === "undefined") { include_primary_key = true; }
            var name, fields = [];
            var trellises = {};
            for (name in properties) {
                var property = properties[name];

                if (property.type == 'list' || property.is_virtual)
                    continue;

                if (property.name != this.trellis.primary_key || include_primary_key) {
                    var field_name = property.get_field_name();
                    var sql = property.query();
                    if (field_name != property.name)
                        sql += ' AS `' + property.name + '`';

                    fields.push(sql);
                    trellises[property.parent.name] = property.parent;
                }
            }
            var joins = [];
            for (name in trellises) {
                var trellis = trellises[name];
                var join = trellis.get_join(this.main_table);
                if (join)
                    joins.push(join);
            }

            return {
                fields: fields,
                joins: joins
            };
        };

        Query.prototype.generate_property_join = function (property, seeds) {
            var join = Ground.Link_Trellis.create_from_property(property);
            return join.generate_join(seeds);
        };

        Query.prototype.get_many_list = function (seed, id, property, relationship) {
            var other_property = property.get_other_property();
            var query = new Query(other_property.parent, this.get_path(property.name));
            query.include_links = false;
            query.expansions = this.expansions;
            if (relationship === Ground.Relationships.many_to_many) {
                var seeds = {};
                seeds[this.trellis.name] = seed;
                query.add_join(query.generate_property_join(property, seeds));
            } else if (relationship === Ground.Relationships.one_to_many)
                query.add_property_filter(other_property.name, id);

            return query.run();
        };

        Query.prototype.get_path = function () {
            var args = [];
            for (var _i = 0; _i < (arguments.length - 0); _i++) {
                args[_i] = arguments[_i + 0];
            }
            var items = [];
            if (this.base_path)
                items.push(this.base_path);

            items = items.concat(args);
            return items.join('/');
        };

        Query.prototype.get_reference_object = function (row, property) {
            var query = new Query(property.other_trellis, this.get_path(property.name));
            query.include_links = false;
            query.expansions = this.expansions;
            query.add_filter(property.other_trellis.query_primary_key() + ' = ' + row[property.name]);
            return query.run().then(function (rows) {
                return rows[0];
            });
        };

        Query.prototype.has_expansion = function (path) {
            for (var i = 0; i < this.expansions.length; ++i) {
                var expansion = this.expansions[i];

                if (expansion[0] == '/' && expansion[expansion.length - 1] == '/') {
                    if (path.match(new RegExp(expansion)))
                        return true;
                } else {
                    if (path == expansion)
                        return true;
                }
            }

            return false;
        };

        Query.prototype.process_row = function (row, authorized_properties) {
            if (typeof authorized_properties === "undefined") { authorized_properties = null; }
            var _this = this;
            var name, property;

            var properties = this.trellis.get_core_properties();
            for (name in properties) {
                property = properties[name];
                row[property.name] = this.ground.convert_value(row[property.name], property.type);
            }

            if (authorized_properties) {
                for (name in authorized_properties) {
                    property = authorized_properties[name];
                    if (row[property.name] !== undefined)
                        row[property.name] = this.ground.convert_value(row[property.name], property.type);
                }
            }

            var links = this.trellis.get_all_links(function (p) {
                return !p.is_virtual;
            });

            var promises = MetaHub.map_to_array(links, function (property, name) {
                var promise, path = _this.get_path(property.name);
                if (authorized_properties && authorized_properties[name] === undefined)
                    return null;

                if (_this.include_links || _this.has_expansion(path)) {
                    var id = row[property.parent.primary_key];
                    var relationship = property.get_relationship();

                    switch (relationship) {
                        case Ground.Relationships.one_to_one:
                            promise = _this.get_reference_object(row, property);
                            break;
                        case Ground.Relationships.one_to_many:
                        case Ground.Relationships.many_to_many:
                            promise = _this.get_many_list(row, id, property, relationship);
                            break;
                    }

                    return promise.then(function (value) {
                        row[name] = value;
                        return row;
                    });
                }

                return null;
            });

            return when.all(promises).then(function () {
                return _this.ground.invoke(_this.trellis.name + '.process.row', row, _this, _this.trellis);
            }).then(function () {
                return row;
            });
        };

        Query.prototype.process_property_filter = function (filter) {
            var result = {
                filters: [],
                arguments: {},
                joins: []
            };
            var property = this.trellis.sanitize_property(filter.property);
            var value = filter.value;

            var placeholder = ':' + property.name + '_filter';
            if (value === 'null' && property.type != 'string') {
                result.filters.push(property.query() + ' IS NULL');
                return result;
            }

            if (value !== null)
                value = this.ground.convert_value(value, property.type);

            if (property.get_relationship() == Ground.Relationships.many_to_many) {
                throw new Error('Filtering many to many will need to be rewritten for the new Link_Trellis.');
                var join_seed = {};
                join_seed[property.name] = ':' + property.name + '_filter';

                result.joins.push(this.generate_property_join(property, join_seed));
            } else {
                if (filter.operator.toLowerCase() == 'like') {
                    result.filters.push(property.query() + ' LIKE ' + placeholder);
                    if (value !== null)
                        value = '%' + value + '%';
                } else {
                    result.filters.push(property.query() + ' = ' + placeholder);
                }
            }

            if (value !== null) {
                result.arguments[placeholder] = value;
            }

            return result;
        };

        Query.prototype.process_property_filters = function () {
            var result = {};
            for (var i in this.property_filters) {
                var filter = this.property_filters[i];
                MetaHub.extend(result, this.process_property_filter(filter));
            }
            return result;
        };

        Query.prototype.run = function (args) {
            if (typeof args === "undefined") { args = {}; }
            var _this = this;
            var properties = this.trellis.get_all_properties();
            var tree = this.trellis.get_tree();
            var promises = tree.map(function (trellis) {
                return _this.ground.invoke(trellis.name + '.query', _this);
            });

            return when.all(promises).then(function () {
                var sql = _this.generate_sql(properties);
                sql = sql.replace(/\r/g, "\n");
                if (_this.ground.log_queries)
                    console.log('query', sql);

                var args = MetaHub.values(_this.arguments).concat(args);
                return _this.db.query(sql).then(function (rows) {
                    return when.all(rows.map(function (row) {
                        return _this.process_row(row, properties);
                    }));
                });
            });
        };

        Query.prototype.run_as_service = function (arguments) {
            if (typeof arguments === "undefined") { arguments = {}; }
            var _this = this;
            var properties = this.trellis.get_all_properties();
            var sql = this.generate_sql(properties);
            sql = sql.replace(/\r/g, "\n");
            if (this.ground.log_queries)
                console.log('query', sql);

            var args = MetaHub.values(this.arguments).concat(arguments);
            return this.db.query(sql).then(function (rows) {
                return when.all(rows.map(function (row) {
                    return _this.process_row(row, properties);
                }));
            }).then(function (rows) {
                return {
                    objects: rows
                };
            });
        };
        Query.operators = [
            '=',
            'LIKE',
            '!='
        ];
        return Query;
    })();
    Ground.Query = Query;
})(Ground || (Ground = {}));
var uuid = require('node-uuid');

var Ground;
(function (Ground) {
    var Update = (function () {
        function Update(trellis, seed, ground) {
            if (typeof ground === "undefined") { ground = null; }
            this.override = true;
            this.main_table = 'node';
            this.is_service = false;
            this.log_queries = false;
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
                for (var i in primary_keys) {
                    var key = primary_keys[i];
                    ids[key] = this.seed[key];
                    conditions.push(key + ' = ' + Ground.Property.get_field_value_sync(ids[key]));
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

        Update.prototype.update_embedded_seed = function (trellis, property, value) {
            var _this = this;
            return this.ground.update_object(trellis, value, this.is_service).then(function (entity) {
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
                    promises.push(this.update_embedded_seed(trellis, property, value));
                }
            }

            return when.all(promises).then(function () {
                for (var name in core_properties) {
                    var property = core_properties[name];
                    if (_this.seed[property.name] !== undefined || _this.is_create_property(property)) {
                        var value = _this.get_field_value(property);

                        fields.push('`' + property.get_field_name() + '`');
                        values.push(value);
                    }
                }

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
                if (!this.user_id)
                    throw new Error('Cannot insert author because current user is not set.');

                return this.user_id;
            }

            return value;
        };

        Update.prototype.is_create_property = function (property) {
            if (property.is_virtual)
                return false;

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
            var promises = [];

            for (var i = 0; i < list.length; i++) {
                var other = list[i];
                var other_id = other_trellis.get_id(other);

                var promise = this.update_reference_object(other, property).then(function () {
                    if (typeof other === 'object' && other._remove) {
                        if (other_id !== null) {
                            var sql = join.generate_delete_row([row, other]);
                            return _this.ground.invoke(join.table_name + '.delete', property, row, other, join).then(function () {
                                return _this.db.query(sql);
                            });
                        }
                    } else {
                        if (other_id === null) {
                            other = _this.ground.update_object(other_trellis, other, _this.user_id).then(function (other) {
                                var seeds = {};
                                seeds[_this.trellis.name] = row;
                                seeds[other_trellis.name] = other;
                                return _this.db.query(join.generate_insert(seeds)).then(function () {
                                    return _this.ground.invoke(join.table_name + '.create', property, row, other, join);
                                });
                            });
                        } else {
                            var seeds = {};
                            seeds[_this.trellis.name] = row;
                            seeds[other_trellis.name] = other;
                            return _this.db.query(join.generate_insert(seeds)).then(function () {
                                return _this.ground.invoke(join.table_name + '.create', property, row, other, join);
                            });
                        }
                    }
                });
                promises.push(promise);
            }

            return when.all(promises);
        };

        Update.prototype.update_one_to_many = function (property, id) {
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

            return this.ground.update_object(trellis, other, this.user_id);
        };

        Update.prototype.run = function () {
            var _this = this;
            var tree = this.trellis.get_tree().filter(function (t) {
                return !t.is_virtual;
            });
            var invoke_promises = tree.map(function (trellis) {
                return _this.ground.invoke(trellis.name + '.update', _this, trellis);
            });
            console.log('tree');
            return when.all(invoke_promises).then(function () {
                console.log('seeeed', _this.seed);
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
var Ground;
(function (Ground) {
    var Delete = (function () {
        function Delete() {
        }
        Delete.prototype.run = function (trellis, seed) {
            throw new Error('Not implemented yet.');
        };
        return Delete;
    })();
    Ground.Delete = Delete;
})(Ground || (Ground = {}));
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
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
            this.log_queries = false;
            this.log_updates = false;
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

        Core.prototype.get_base_property_type = function (type) {
            var property_type = this.property_types[type];
            if (property_type.parent)
                return this.get_base_property_type(property_type.parent.name);

            return property_type;
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
                trellis.initialize(all);
            }
        };

        Core.prototype.insert_object = function (trellis, seed, uid, as_service) {
            if (typeof seed === "undefined") { seed = {}; }
            if (typeof uid === "undefined") { uid = null; }
            if (typeof as_service === "undefined") { as_service = false; }
            return this.update_object(trellis, seed, uid, as_service);
        };

        Core.is_private = function (property) {
            return property.is_private;
        };

        Core.is_private_or_readonly = function (property) {
            return property.is_private || property.is_readonly;
        };

        Core.prototype.update_object = function (trellis, seed, uid, as_service) {
            if (typeof seed === "undefined") { seed = {}; }
            if (typeof uid === "undefined") { uid = null; }
            if (typeof as_service === "undefined") { as_service = false; }
            var trellis = this.sanitize_trellis_argument(trellis);

            if (seed._deleted === true || seed._deleted === 'true')
                return this.delete_object(trellis, seed);

            this.invoke(trellis.name + '.update', seed, trellis);
            var update = new Ground.Update(trellis, seed, this);
            update.user_id = uid;
            update.is_service = as_service;
            update.log_queries = this.log_updates;
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

            return subset;
        };

        Core.prototype.parse_schema = function (data) {
            var subset = null;
            if (data.trellises)
                subset = this.load_trellises(data.trellises);

            if (data.views)
                this.views = this.views.concat(data.views);

            if (data.tables)
                this.load_tables(data.tables);

            if (subset)
                this.initialize_trellises(subset, this.trellises);
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
var Ground;
(function (Ground) {
    var Table = (function () {
        function Table(name, ground) {
            this.properties = {};
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

        Table.prototype.create_sql = function (ground) {
            var fields = [];
            for (var name in this.properties) {
                var property = this.properties[name];

                var field = {
                    name: property.name || name,
                    type: ground.get_base_property_type(property.type).field_type,
                    default: undefined
                };

                if (property.default !== undefined)
                    field.default = property.default;

                fields.push(field);
            }

            return Table.create_sql_from_array(this.name, fields, this.primary_keys, this.indexes);
        };

        Table.create_sql_from_array = function (table_name, source, primary_keys, indexes) {
            if (typeof primary_keys === "undefined") { primary_keys = []; }
            if (typeof indexes === "undefined") { indexes = []; }
            var fields = MetaHub.map_to_array(source, function (field, index) {
                var name = field.name || index;
                var type = field.type;

                if (!type) {
                    console.log('source', table_name, source);
                    throw new Error('Field ' + name + ' is missing a type.');
                }

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

            var primary_keys = this.get_primary_keys(trellis);

            return Table.create_sql_from_array(this.name, fields, primary_keys, this.indexes);
        };

        Table.prototype.get_primary_keys = function (trellis) {
            if (!this.primary_keys && trellis.parent) {
                var parent = trellis.parent;
                do {
                    if (parent.table && parent.table.primary_keys) {
                        return parent.table.primary_keys;
                    }
                } while(parent = parent.parent);
            }

            if (this.primary_keys && this.primary_keys.length > 0) {
                return this.primary_keys.map(function (name) {
                    if (!trellis.properties[name])
                        throw new Error('Error creating ' + trellis.name + '; it does not have a primary key named ' + name + '.');

                    return trellis.properties[name].get_field_name();
                });
            }

            return [trellis.properties[trellis.primary_key].get_field_name()];
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
            var name = this.name;
            MetaHub.extend(this, source);
            if (this.ground.trellises[name]) {
                this.trellis = this.ground.trellises[name];
                this.trellis.table = this;
                if (!source.name)
                    this.name = this.trellis.get_plural();
            }
        };
        return Table;
    })();
    Ground.Table = Table;
})(Ground || (Ground = {}));
var Ground;
(function (Ground) {
    var Link_Trellis = (function () {
        function Link_Trellis(trellises) {
            var _this = this;
            this.trellises = [];
            this.trellis_dictionary = {};
            this.trellises = trellises;

            for (var i = 0; i < trellises.length; ++i) {
                var trellis = trellises[i];
                this.trellis_dictionary[trellis.name] = trellis;
            }

            this.table_name = trellises.map(function (t) {
                return t.get_plural();
            }).sort().join('_');

            this.identities = trellises.map(function (x) {
                return _this.create_identity(x);
            });
        }
        Link_Trellis.prototype.create_identity = function (trellis) {
            var properties = [], property, name;
            var keys = trellis.get_primary_keys();

            for (var i = 0; i < keys.length; ++i) {
                property = keys[i];
                if (property.name == trellis.primary_key)
                    name = trellis.name;
else
                    name = trellis.name + '_' + property.name;

                properties.push(Link_Trellis.create_reference(property, name));
            }

            return {
                name: trellis.name,
                trellis: trellis,
                keys: properties
            };
        };

        Link_Trellis.create_from_property = function (property) {
            var trellises = [
                property.parent,
                property.other_trellis
            ];
            return new Link_Trellis(trellises);
        };

        Link_Trellis.create_reference = function (property, name) {
            return {
                name: name,
                type: property.type,
                property: property
            };
        };

        Link_Trellis.prototype.generate_join = function (seeds) {
            return 'JOIN ' + this.table_name + ' ON ' + this.get_condition_string(seeds) + "\n";
        };

        Link_Trellis.prototype.generate_delete_row = function (seeds) {
            return 'DELETE ' + this.table_name + ' ON ' + this.get_condition_string(seeds) + "\n";
        };

        Link_Trellis.prototype.generate_insert = function (seeds) {
            var values = [], keys = [];
            console.log('seeds', seeds);

            for (var i in this.identities) {
                var identity = this.identities[i], seed = seeds[identity.trellis.name];
                for (var p in identity.keys) {
                    var key = identity.keys[p];
                    keys.push(key.name);
                    values.push(key.property.get_sql_value(seed[key.property.name]));
                }
            }

            return 'REPLACE INTO ' + this.table_name + ' (`' + keys.join('`, `') + '`) VALUES (' + values.join(', ') + ');\n';
        };

        Link_Trellis.prototype.generate_table_name = function () {
            var temp = MetaHub.map_to_array(this.identities, function (p) {
                return p.parent.get_plural();
            });
            temp = temp.sort();
            this.table_name = temp.join('_');
        };

        Link_Trellis.prototype.get_condition = function (key, seed) {
            if (!seed) {
                console.log('empty key');
            }
            if (seed[key.property.name] !== undefined) {
                var value = seed[key.property.name];
                if (typeof value === 'function')
                    value == value();
else
                    value = key.property.get_sql_value(value);

                return this.table_name + '.' + key.name + ' = ' + value;
            } else
                return null;
        };

        Link_Trellis.prototype.get_condition_string = function (seeds) {
            return this.get_conditions(seeds).join(' AND ');
        };

        Link_Trellis.prototype.get_conditions = function (seeds) {
            var conditions = [];
            for (var i in this.identities) {
                var identity = this.identities[i], seed = seeds[identity.trellis.name];
                if (!seed)
                    continue;

                for (var p in identity.keys) {
                    var key = identity.keys[p];
                    var condition = this.get_condition(key, seed);
                    if (condition)
                        conditions.push(condition);
                }
            }

            return conditions;
        };
        return Link_Trellis;
    })();
    Ground.Link_Trellis = Link_Trellis;
})(Ground || (Ground = {}));
var Ground;
(function (Ground) {
    (function (Relationships) {
        Relationships[Relationships["one_to_one"] = 0] = "one_to_one";
        Relationships[Relationships["one_to_many"] = 1] = "one_to_many";
        Relationships[Relationships["many_to_many"] = 2] = "many_to_many";
    })(Ground.Relationships || (Ground.Relationships = {}));
    var Relationships = Ground.Relationships;

    var Property = (function () {
        function Property(name, source, trellis) {
            this.name = null;
            this.parent = null;
            this.type = null;
            this.is_readonly = false;
            this.insert = null;
            this.other_property = null;
            this.other_trellis = null;
            this.other_trellis_name = null;
            this.is_private = false;
            this.is_virtual = false;
            this.composite_properties = null;
            for (var i in source) {
                if (this.hasOwnProperty(i))
                    this[i] = source[i];
            }

            if (source.trellis) {
                this.other_trellis_name = source.trellis;
            }

            this.name = name;
            this.parent = trellis;
        }
        Property.prototype.initialize_composite_reference = function (other_trellis) {
            var table = other_trellis.table;
            if (table && table.primary_keys && table.primary_keys.length > 1) {
                for (var i = 0; i < table.primary_keys.length; ++i) {
                    var key = table.primary_keys[i];
                    var name = other_trellis.name + '_' + key;
                    if (key != other_trellis.primary_key) {
                        var other_property = other_trellis.properties[key];
                        var new_property = this.parent.add_property(name, other_property.get_data());
                        new_property.other_property = key;
                        new_property.other_trellis_name = this.parent.name;
                        new_property.other_trellis = this.parent;
                        this.composite_properties = this.composite_properties || [];
                        this.composite_properties.push(new_property);
                    }
                }
            }
        };

        Property.prototype.get_data = function () {
            var result = {
                type: this.type
            };
            if (this.other_trellis_name)
                result.trellis = this.other_trellis_name;

            if (this.is_readonly)
                result.is_readonly = this.is_readonly;

            if (this.is_private)
                result.is_private = this.is_private;

            if (this.insert)
                result.insert = this.insert;

            return result;
        };

        Property.prototype.get_default = function () {
            if (this.default == undefined && this.parent.parent && this.parent.parent.properties[this.name])
                return this.parent.parent.properties[this.name].get_default();

            return this.default;
        };

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
            if (this.type == 'reference') {
                var other_primary_property = this.other_trellis.properties[this.other_trellis.primary_key];
                return other_primary_property.get_field_type();
            }
            var property_type = this.get_property_type();
            if (!property_type)
                throw new Error(this.name + ' could not find valid field type: ' + this.type);

            return property_type.get_field_type();
        };

        Property.get_field_value_sync = function (value) {
            if (typeof value === 'string') {
                value = value.replace(/'/g, "\\'", value);
                value = "'" + value.replace(/[\r\n]+/, "\n") + "'";
            } else if (value === true)
                value = 'TRUE';
else if (value === false)
                value = 'FALSE';
            if (value === null || value === undefined)
                value = 'NULL';

            return value;
        };

        Property.prototype.get_sql_value = function (value, type) {
            if (typeof type === "undefined") { type = null; }
            type = type || this.type;
            var property_type = this.parent.ground.property_types[type];
            if (value === undefined || value === null) {
                value = this.get_default();
            }

            if (property_type && property_type.parent)
                return this.get_sql_value(value, property_type.parent.name);

            switch (type) {
                case 'list':

                case 'reference':
                    if (typeof value === 'object') {
                        value = value[this.other_trellis.primary_key];
                    }
                    return value || 'NULL';
                case 'int':
                    if (!value)
                        return 0;

                    return Math.round(value);
                case 'string':
                case 'text':
                    value = value.replace(/'/g, "\\'", value);
                    return "'" + value.replace(/[\r\n]+/, "\n") + "'";
                case 'bool':
                    return value ? 'TRUE' : 'FALSE';
                case 'float':
                case 'double':
                    if (!value)
                        return 0;

                    return parseFloat(value);
                case 'money':
                    if (typeof value !== 'number')
                        return parseFloat(value.toString());
            }

            throw new Error('Ground is not configured to process property types of ' + type + ' (' + this.type + ')');
        };

        Property.prototype.get_field_value = function (value, as_service, update) {
            if (typeof as_service === "undefined") { as_service = false; }
            if (typeof update === "undefined") { update = false; }
            if (typeof value === 'string')
                value = value.replace(/'/g, "\\'", value);

            if (value === true)
                value = 'TRUE';
else if (value === false)
                value = 'FALSE';
            if (value === null || value === undefined)
                value = 'NULL';
else if (this.type == 'string' || this.type == 'text' || this.type == 'guid') {
                value = "'" + value.replace(/[\r\n]+/, "\n") + "'";
            } else if (this.type == 'reference') {
                if (typeof value !== 'object') {
                    var other_primary_property = this.other_trellis.properties[this.other_trellis.primary_key];
                    value = other_primary_property.get_field_value(value, as_service, update);
                }
            }

            return value;
        };

        Property.prototype.get_other_id = function (entity) {
            var value = entity[this.other_trellis.primary_key];
            if (value === undefined)
                value = null;

            return value;
        };

        Property.prototype.get_other_property = function (create_if_none) {
            if (typeof create_if_none === "undefined") { create_if_none = true; }
            var property;
            if (this.other_property) {
                return this.other_trellis.properties[this.other_property];
            } else {
                for (var name in this.other_trellis.properties) {
                    property = this.other_trellis.properties[name];
                    if (property.other_trellis === this.parent) {
                        return property;
                    }
                }
            }

            if (this.other_trellis === this.parent)
                return null;

            if (!create_if_none)
                return null;

            var attributes = {};
            attributes.type = 'list';
            attributes.trellis = this.parent.name;
            return new Property('_' + this.other_trellis.name, attributes, this.other_trellis);
        };

        Property.prototype.get_property_type = function () {
            var types = this.parent.ground.property_types;
            if (types[this.type] !== undefined)
                return types[this.type];

            return null;
        };

        Property.prototype.get_referenced_trellis = function () {
            return this.other_trellis;
        };

        Property.prototype.get_relationship = function () {
            var field = this.get_field_override();
            if (field && field.relationship) {
                return Relationships[field.relationship];
            }

            var other_property = this.get_other_property();
            if (!other_property)
                throw new Error(this.parent.name + '.' + this.name + ' does not have a reciprocal reference.');

            if (this.type == 'list') {
                if (other_property.type == 'list')
                    return Relationships.many_to_many;
else
                    return Relationships.one_to_many;
            }
            return Relationships.one_to_one;
        };

        Property.prototype.query = function () {
            return this.parent.get_table_name() + '.' + this.get_field_name();
        };
        return Property;
    })();
    Ground.Property = Property;
})(Ground || (Ground = {}));
var Ground;
(function (Ground) {
    var Irrigation = (function () {
        function Irrigation(ground) {
            this.ground = ground;
        }
        Irrigation.prototype.query = function (request) {
            var i, trellis = this.ground.sanitize_trellis_argument(request.trellis);
            var query = new Ground.Query(trellis);

            if (request.filters) {
                for (i = 0; i < request.filters.length; ++i) {
                    var filter = request.filters[i];
                    query.add_property_filter(filter.property, filter.value, filter.operator);
                }
            }

            if (request.sorts) {
                for (i = 0; i < request.sorts.length; ++i) {
                    query.add_sort(request.sorts[i]);
                }
            }

            if (request.expansions) {
                for (i = 0; i < request.expansions.length; ++i) {
                    query.expansions.push(request.expansions[i]);
                }
            }

            return query.run();
        };

        Irrigation.prototype.update = function (request, uid) {
            if (typeof uid === "undefined") { uid = null; }
            var promises = [];

            if (!request.objects)
                throw new Error('Request requires an objects array.');

            for (var i = 0; i < request.objects.length; ++i) {
                var object = request.objects[i];
                var promise = this.ground.update_object(object.trellis, object, uid);
                promises.push(promise);
            }

            return when.all(promises);
        };
        return Irrigation;
    })();
    Ground.Irrigation = Irrigation;
})(Ground || (Ground = {}));
require('source-map-support').install();
//# sourceMappingURL=ground.js.map
