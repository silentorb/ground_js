/**
* Created with JetBrains PhpStorm.
* User: Chris Johnson
* Date: 9/18/13
*/
/// <reference path="../references.ts"/>
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

        Query.prototype.generate_property_join = function (property, seed) {
            var join = new Ground.Link_Trellis(property);
            return join.generate_join(seed);
        };

        Query.prototype.get_many_list = function (seed, id, property, relationship) {
            var other_property = property.get_other_property();
            var query = new Query(other_property.parent, this.get_path(property.name));
            query.include_links = false;
            query.expansions = this.expansions;
            if (relationship === Ground.Relationships.many_to_many)
                query.add_join(query.generate_property_join(property, seed));
else if (relationship === Ground.Relationships.one_to_many)
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
            var name, property, promise, promises = [];

            for (name in this.trellis.properties) {
                property = this.trellis.properties[name];
                var field_name = property.get_field_name();
                if (property.name != field_name && row[field_name] !== undefined) {
                    row[property] = row[field_name];
                    delete row[field_name];
                }
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

            for (name in links) {
                property = links[name];

                var path = this.get_path(property.name);
                if (authorized_properties && authorized_properties[name] === undefined)
                    continue;

                if (this.include_links || this.has_expansion(path)) {
                    var id = row[property.parent.primary_key];
                    var relationship = property.get_relationship();

                    switch (relationship) {
                        case Ground.Relationships.one_to_one:
                            promise = this.get_reference_object(row, property);
                            break;
                        case Ground.Relationships.one_to_many:
                        case Ground.Relationships.many_to_many:
                            promise = this.get_many_list(row, id, property, relationship);
                            break;
                    }

                    promise = promise.then(function (value) {
                        return row[name] = value;
                    });
                    promises.push(promise);
                }
            }

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
                if (Query.log_queries)
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
            if (Query.log_queries)
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
        Query.log_queries = false;
        Query.operators = [
            '=',
            'LIKE',
            '!='
        ];
        return Query;
    })();
    Ground.Query = Query;
})(Ground || (Ground = {}));
//# sourceMappingURL=Query.js.map
