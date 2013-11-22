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
            this.post_clauses = [];
            this.include_links = true;
            this.fields = [];
            this.arguments = {};
            this.expansions = [];
            this.wrappers = [];
            this.type = 'query';
            this.filters = [];
            this.property_filters = [];
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

            if (value === null || value === undefined)
                throw new Error('Cannot add property filter where value is null');

            this.property_filters.push({
                property: property,
                value: value,
                operator: operator
            });
        };

        Query.prototype.add_key_filter = function (value) {
            this.add_property_filter(this.trellis.primary_key, value);
            //      this.filters.push(this.trellis.query_primary_key() + ' = :primary_key');
            //      this.add_arguments({ ':primary_key': value });
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
            var filters;
            var data = this.get_fields_and_joins(properties);
            var data2 = this.process_property_filters();
            var fields = data.fields.concat(this.fields);
            var joins = data.joins.concat(this.joins, data2.joins);
            var args = MetaHub.concat(this.arguments, data2.arguments);
            if (data2.filters)
                filters = this.filters.concat(data2.filters);
else
                filters = this.filters;

            if (fields.length == 0)
                throw new Error('No authorized fields found for trellis ' + this.main_table + '.');

            var sql = 'SELECT ';
            sql += fields.join(",\n");
            sql += "\nFROM " + this.main_table;
            if (joins.length > 0)
                sql += "\n" + joins.join("\n");

            if (filters.length > 0)
                sql += "\nWHERE " + filters.join(" AND ");

            if (this.post_clauses.length > 0)
                sql += " " + this.post_clauses.join(" ");

            for (var i = 0; i < this.wrappers.length; ++i) {
                var wrapper = this.wrappers[i];
                sql = wrapper.start + sql + wrapper.end;
            }

            for (var pattern in args) {
                var value = args[pattern];

                //        sql = sql.replace(new RegExp(pattern), Property.get_sql_value(value));
                sql = sql.replace(new RegExp(pattern), value);
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

        Query.prototype.create_sub_query = function (trellis, property) {
            var query = new Query(trellis, this.get_path(property.name));
            query.include_links = false;
            query.expansions = this.expansions;
            var source = this.source;
            if (typeof source === 'object' && typeof source.properties === 'object' && typeof source.properties[property.name] === 'object') {
                query.extend(source.properties[property.name]);
            }

            return query;
        };

        Query.prototype.get_many_list = function (seed, property, relationship) {
            var id = seed[property.parent.primary_key];
            var other_property = property.get_other_property();
            var query = this.create_sub_query(other_property.parent, property);
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
            var query = this.create_sub_query(property.other_trellis, property);
            query.add_key_filter(row[property.name]);
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

        Query.prototype.process_row = function (row) {
            var _this = this;
            var name, property;

            var properties = this.trellis.get_core_properties();
            for (name in properties) {
                property = properties[name];
                row[property.name] = this.ground.convert_value(row[property.name], property.type);
            }

            var links = this.trellis.get_all_links(function (p) {
                return !p.is_virtual;
            });

            var promises = MetaHub.map_to_array(links, function (property, name) {
                var path = _this.get_path(property.name);

                if (_this.include_links || _this.has_expansion(path)) {
                    return _this.query_link_property(row, property).then(function (value) {
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

        Query.prototype.query_link_property = function (seed, property) {
            var relationship = property.get_relationship();

            switch (relationship) {
                case Ground.Relationships.one_to_one:
                    return this.get_reference_object(seed, property);
                    break;
                case Ground.Relationships.one_to_many:
                case Ground.Relationships.many_to_many:
                    return this.get_many_list(seed, property, relationship);
                    break;
            }

            throw new Error('Could not find relationship: ' + relationship + '.');
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

            if (value === null || value === undefined) {
                throw new Error('Query property filter ' + placeholder + ' is null.');
            }

            if (property.get_relationship() == Ground.Relationships.many_to_many) {
                //        throw new Error('Filtering many to many will need to be rewritten for the new Link_Trellis.');
                var join_seed = {};
                join_seed[property.other_trellis.name] = ':' + property.name + '_filter';

                //        var other_property = property.get_other_property()
                //        join_seed[property.parent.name] =
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
                value = property.get_sql_value(value);
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

        Query.prototype.extend = function (source) {
            var i;

            this.source = source;

            if (source.filters) {
                for (i = 0; i < source.filters.length; ++i) {
                    var filter = source.filters[i];
                    this.add_property_filter(filter.property, filter.value, filter.operator);
                }
            }

            if (source.sorts) {
                for (i = 0; i < source.sorts.length; ++i) {
                    this.add_sort(source.sorts[i]);
                }
            }

            if (source.properties) {
                var properties = this.trellis.get_all_properties();
                this.properties = {};
                for (var key in source.properties) {
                    if (properties[key])
                        this.properties[key] = properties[key];
                }
            }
        };

        Query.prototype.run_core = function () {
            var _this = this;
            if (this.row_cache)
                return when.resolve(this.row_cache);

            var properties;
            if (this.properties && this.properties.length > 0)
                properties = this.properties;
else
                properties = this.trellis.get_all_properties();

            var tree = this.trellis.get_tree();
            var promises = tree.map(function (trellis) {
                return _this.ground.invoke(trellis.name + '.query', _this);
            });

            return when.all(promises).then(function () {
                var sql = _this.generate_sql(properties);
                sql = sql.replace(/\r/g, "\n");
                if (_this.ground.log_queries)
                    console.log('query', sql);

                //          var args = MetaHub.values(this.arguments).concat(args);
                return _this.db.query(sql).then(function (rows) {
                    _this.row_cache = rows;
                    return rows;
                });
            });
        };

        Query.prototype.run = function () {
            var _this = this;
            var properties = this.trellis.get_all_properties();
            return this.run_core().then(function (rows) {
                return when.all(rows.map(function (row) {
                    return _this.process_row(row);
                }));
            });
        };

        Query.prototype.run_single = function () {
            return this.run().then(function (rows) {
                return rows[0];
            });
        };

        Query.query_path = function (path, args, ground) {
            var sql = Query.follow_path(path, args, ground);
            return ground.db.query(sql);
        };

        Query.follow_path = // Returns a sql query string
        // The first token in the path is required to have an args entry
        // Or the
        function (path, args, ground) {
            var trellis;

            if (typeof path !== 'string')
                throw new Error('query path must be a string.');

            path = path.trim();

            if (!path)
                throw new Error('Empty query path.');

            var tokens = path.split('/');
            var sql = 'SELECT ';

            var parts = Query.process_tokens(tokens, args, ground);
            for (var i = 0; i < parts.length; ++i) {
                var part = parts[i];
            }

            return sql;
        };

        Query.process_tokens = function (tokens, args, ground) {
            var result = [];
            var trellis;
            for (var i = 0; i < tokens.length; ++i) {
                var token = tokens[i];
                if (token[0] == ':') {
                    var arg = args[token];
                    trellis = arg.trellis;
                }
            }

            return result;
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
//# sourceMappingURL=Query.js.map
