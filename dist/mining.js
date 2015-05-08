/// <reference path="../../../vineyard-metahub/metahub.d.ts"/>
/// <reference path="../../dist/landscape.d.ts"/>
var mining;
(function (mining) {
    var InputError = (function () {
        function InputError(message, key) {
            if (key === void 0) { key = undefined; }
            this.name = "InputError";
            this.status = 400;
            this.message = message;
            this.key = key;
        }
        return InputError;
    })();
    mining.InputError = InputError;
    function path_to_array(path) {
        if (MetaHub.is_array(path))
            return path;
        path = path.trim();
        if (!path)
            throw new Error('Empty query path.');
        return path.split(/[\/\.]/);
    }
    mining.path_to_array = path_to_array;
})(mining || (mining = {}));
var mining;
(function (mining) {
    var Embedded_Reference = (function () {
        function Embedded_Reference(property, id, properties, previous) {
            if (previous === void 0) { previous = undefined; }
            this.properties = [];
            this.tables = {};
            this.children = [];
            if (!previous)
                previous = new mining.Join_Trellis_Wrapper(property.parent);
            this.property = property;
            var trellises = {};
            for (var i in properties) {
                var prop = properties[i];
                trellises[prop.parent.name] = prop.parent;
            }
            for (var i in trellises) {
                var trellis = trellises[i];
                this.tables[i] = new mining.Reference_Join(mining.Join_Property.create_from_property(property), previous, new mining.Join_Trellis_Wrapper(trellis, trellis.get_table_name() + '_' + id));
            }
            this.properties = properties;
        }
        Embedded_Reference.prototype.get_field_name = function (property) {
            var table = this.get_table(property);
            return table.second.get_alias() + '_' + property.name;
        };
        Embedded_Reference.prototype.get_table = function (property) {
            return this.tables[property.parent.name];
        };
        //render_join():string {
        //  return 'JOIN ' + this.trellis.get_table_query() + ' ' + this.alias
        //    + ' ON ' + this.property.query() + ' = ' + this.alias + '.' + this.trellis.get_primary_keys()[0].get_field_name()
        //}
        Embedded_Reference.prototype.render = function () {
            var joins = [];
            for (var i in this.tables) {
                joins.push(this.tables[i].render());
            }
            return joins.join("\n");
        };
        Embedded_Reference.prototype.render_field = function (property) {
            var table = this.get_table(property);
            if (!table)
                console.log('prop', property.fullname());
            var table_name = table.second.get_alias();
            if (property.is_virtual)
                return property.query_virtual_field(table_name, this.get_field_name(property));
            return property.get_field_query2(table_name + '.' + property.get_field_name(), this.get_field_name(property));
        };
        Embedded_Reference.prototype.render_dummy_field = function (property) {
            return 'NULL AS ' + this.get_field_name(property);
        };
        Embedded_Reference.prototype.cleanup_empty = function (source) {
            for (var p in this.properties) {
                var property = this.properties[p];
                var field_name = this.get_field_name(property);
                if (source[field_name] === undefined)
                    continue;
                delete source[field_name];
            }
            for (var i = 0; i < this.children.length; ++i) {
                this.children[i].cleanup_empty(source);
            }
        };
        Embedded_Reference.prototype.cleanup_entity = function (source, target) {
            var primary_key = source[this.property.name];
            if (primary_key === null || primary_key === undefined) {
                var table = this.tables[this.property.other_trellis.name];
                var key = table.second.get_alias() + '_' + this.property.other_trellis.primary_key;
                primary_key = source[key];
            }
            if (primary_key === null || primary_key === undefined) {
                this.cleanup_empty(source);
                source[this.property.name] = null;
                return;
            }
            var child_entity = target[this.property.name] = {};
            for (var p in this.properties) {
                var property = this.properties[p];
                var field_name = this.get_field_name(property);
                if (source[field_name] === undefined)
                    continue;
                child_entity[property.name] = property.parent.schema.convert_value(source[field_name], property.type);
                delete source[field_name];
            }
            for (var i = 0; i < this.children.length; ++i) {
                this.children[i].cleanup_entity(source, child_entity);
            }
        };
        Embedded_Reference.has_reference = function (list, reference) {
            for (var i = 0; i < list.length; ++i) {
                if (list[i].property == reference.property)
                    return true;
            }
            return false;
        };
        return Embedded_Reference;
    })();
    mining.Embedded_Reference = Embedded_Reference;
})(mining || (mining = {}));
/// <reference path="interfaces.ts"/>
var mining;
(function (mining) {
    var Link_Trellis = (function () {
        function Link_Trellis(trellises, table_name) {
            var _this = this;
            if (table_name === void 0) { table_name = null; }
            this.trellises = [];
            this.trellis_dictionary = {}; // Should contain the same values as trellises, just keyed by trellis name
            this.trellises = trellises;
            for (var i = 0; i < trellises.length; ++i) {
                var trellis = trellises[i];
                this.trellis_dictionary[trellis.name] = trellis;
            }
            this.table_name = table_name || trellises.map(function (t) { return t.get_table_name(); }).sort().join('_');
            this.identities = trellises.map(function (x) { return _this.create_identity(x); });
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
            var field = property.get_field_override();
            var table_name = field ? field.other_table : null;
            var trellises = [
                property.parent,
                property.other_trellis
            ];
            return new Link_Trellis(trellises, table_name);
        };
        Link_Trellis.create_reference = function (property, name) {
            return {
                name: name,
                type: property.type,
                property: property
            };
        };
        Link_Trellis.prototype.generate_join = function (seeds) {
            //      var sql = "JOIN %table_name ON %table_name.%second_key = " + id +
            //        " AND %table_name.%first_key = %back_id\n";
            return 'JOIN ' + this.get_table_declaration() + ' ON ' + this.get_condition_string(seeds) + "\n";
        };
        Link_Trellis.prototype.generate_delete_row = function (seeds) {
            //      var sql = "DELETE FROM %table_name WHERE %table_name.%first_key = " + first_id +
            //        " AND %table_name.%second_key = " + second_id + "\n;"
            //      return Link_Trellis2.populate_sql(sql, this.args);
            return 'DELETE ' + this.table_name + ' ON ' + this.get_condition_string(seeds) + "\n";
        };
        Link_Trellis.prototype.generate_insert = function (seeds) {
            var values = [], keys = [];
            for (var i in this.identities) {
                var identity = this.identities[i], seed = seeds[identity.trellis.name];
                for (var p in identity.keys) {
                    var key = identity.keys[p], value;
                    keys.push(key.name);
                    if (typeof seed === 'object')
                        value = seed[key.property.name];
                    else
                        value = seed;
                    values.push(key.property.get_sql_value(value));
                }
            }
            //      for (var i in this.identities) {
            //        var list = this.identities[i], seed = seeds[i]
            //        for (var p in list) {
            //          var property = list[p], seed = seeds[i], name = property.name
            ////          if ()
            //          keys.push(name)
            //          values.push(property.get_sql_value(seed[name]))
            //        }
            //      }
            return 'REPLACE INTO ' + this.table_name + ' (`' + keys.join('`, `') + '`) VALUES (' + values.join(', ') + ');\n';
            //      var sql = "REPLACE INTO %table_name (`%first_key`, `%second_key`) VALUES ("
            //        + first_id + ", " + second_id + ")\n;"
            //      return Link_Trellis2.populate_sql(sql, this.args);
        };
        Link_Trellis.prototype.generate_table_name = function () {
            var temp = MetaHub.map_to_array(this.identities, function (p) { return p.parent.get_table_name(); });
            temp = temp.sort();
            this.table_name = temp.join('_');
        };
        Link_Trellis.prototype.get_key_condition = function (key, seed, fill_blanks) {
            if (fill_blanks === void 0) { fill_blanks = false; }
            if (!seed) {
                console.log('empty key');
            }
            if (typeof seed === 'string' || typeof seed === 'number')
                return this.table_name + '.' + key.name + ' = ' + seed;
            if (seed[key.property.name] !== undefined) {
                var value = seed[key.property.name];
                if (typeof value === 'function')
                    value == value();
                else if (typeof value === 'string' && value[0] == ':')
                    value = value;
                else
                    value = key.property.get_sql_value(value);
                return this.table_name + '.' + key.name + ' = ' + value;
            }
            else if (fill_blanks) {
                return this.table_name + '.' + key.name + ' = ' + key.property.query();
            }
            return null;
        };
        Link_Trellis.prototype.get_condition_string = function (seeds) {
            return this.get_conditions(seeds).join(' AND ');
        };
        Link_Trellis.prototype.get_identity_conditions = function (identity, seed, fill_blanks) {
            if (fill_blanks === void 0) { fill_blanks = false; }
            var conditions = [];
            for (var p in identity.keys) {
                var key = identity.keys[p];
                var condition = this.get_key_condition(key, seed, fill_blanks);
                if (condition)
                    conditions.push(condition);
            }
            return conditions;
        };
        Link_Trellis.prototype.get_conditions = function (seeds) {
            var table_name = typeof this.alias === 'string' ? this.alias : this.table_name;
            var conditions = [];
            for (var i in this.identities) {
                var identity = this.identities[i], seed = seeds[identity.trellis.name];
                if (!seed) {
                    var other_identity = this.identities[1 - i];
                    for (var p in identity.keys) {
                        var key = identity.keys[p], other_key = other_identity.keys[p];
                        conditions.push(table_name + '.' + key.name + ' = `' + identity.trellis.get_table_name() + '`.' + key.property.name);
                    }
                }
                else {
                    conditions = conditions.concat(this.get_identity_conditions(identity, seed));
                }
            }
            return conditions;
        };
        Link_Trellis.prototype.get_identity_by_trellis = function (trellis) {
            for (var i = 0; i < this.identities.length; ++i) {
                var identity = this.identities[i];
                if (identity.trellis === trellis)
                    return identity;
            }
            return null;
        };
        Link_Trellis.prototype.get_table_declaration = function () {
            return typeof this.alias === 'string' ? this.table_name + ' ' + this.alias : this.table_name;
        };
        return Link_Trellis;
    })();
    mining.Link_Trellis = Link_Trellis;
})(mining || (mining = {}));
/// <reference path="interfaces.ts"/>
/// <reference path="Link_Trellis.ts"/>
var mining;
(function (mining) {
    var Query_Renderer = (function () {
        function Query_Renderer(schema) {
            this.schema = schema;
        }
        Query_Renderer.apply_arguments = function (sql, args) {
            for (var pattern in args) {
                var value = args[pattern];
                sql = sql.replace(new RegExp(pattern, 'g'), value);
            }
            return sql;
        };
        Query_Renderer.generate_property_join = function (property, seeds) {
            var join = mining.Link_Trellis.create_from_property(property);
            console.log('join', property.name, seeds);
            return join.generate_join(seeds);
        };
        Query_Renderer.prototype.generate_sql = function (parts, source) {
            var sql = 'SELECT ' + parts.fields + parts.from + parts.joins + parts.filters;
            sql += "\nGROUP BY " + this.get_group_keys(source.trellis);
            sql += parts.sorts;
            for (var i = 0; i < source.transforms.length; ++i) {
                var transform = source.transforms[i];
                var temp_table = 'transform_' + (i + 1);
                sql = 'SELECT * FROM (' + sql + ' ) ' + temp_table + ' ' + transform.clause;
            }
            sql = Query_Renderer.apply_arguments(sql, parts.args) + parts.pager;
            return sql;
        };
        Query_Renderer.prototype.get_group_keys = function (trellis) {
            return trellis.table && trellis.table.primary_keys && trellis.table.primary_keys.length > 1 ? trellis.table.primary_keys.map(function (k) { return trellis.get_table_query() + '.' + k; }).join(', ') : trellis.query_primary_key();
        };
        Query_Renderer.prototype.generate_count = function (parts) {
            var sql = 'SELECT COUNT(*) AS total_number' + parts.from + parts.joins + parts.filters;
            sql = Query_Renderer.apply_arguments(sql, parts.args);
            return sql;
        };
        Query_Renderer.prototype.generate_union = function (parts, queries, source) {
            var alias = source.trellis.get_table_name();
            //var sql = 'SELECT DISTINCT * FROM ('
            var sql = '(' + queries.join('\n)\nUNION\n(\n') + ')\n' + parts.filters.replace(/`?\w+`?\./g, '') + parts.sorts.replace(/`?\w+`?\./g, '');
            sql = Query_Renderer.apply_arguments(sql, parts.args) + parts.pager;
            return sql;
        };
        Query_Renderer.prototype.generate_union_count = function (parts, queries, source) {
            return 'SELECT 1024 AS total_number';
            //var alias = source.trellis.get_table_name()
            //var sql = 'SELECT COUNT(DISTINCT ' + source.trellis.query() + ') AS total_number FROM ('
            //  + queries.map((q)=> q.replace(/LIMIT\s+\d+/g, '')).join('\nUNION\n')
            //  + '\n) ' + alias + '\n'
            //  + parts.filters.replace(/`?\w+`?\./g, '')
            //  //+ parts.sorts
            //
            //sql = Query_Renderer.apply_arguments(sql, parts.args)
            //return sql;
        };
        Query_Renderer.prototype.generate_parts = function (source, query_id) {
            if (query_id === void 0) { query_id = undefined; }
            var data = new mining.Field_List(source);
            var data2 = Query_Renderer.build_filters(source, source.filters, this.schema, true);
            var sorts = source.sorts.length > 0 ? Query_Renderer.render_sorts(source, data2) : null;
            var fields = data.fields;
            var joins = data.joins.concat(mining.Join.render_paths(source.trellis, data2.property_joins));
            var args = data2.arguments;
            var filters = data2.filters || [];
            if (fields.length == 0)
                throw new Error('No authorized fields found for trellis ' + source.trellis.name + '.');
            if (typeof query_id === 'number') {
                fields.unshift(query_id.toString() + ' AS _query_id_');
            }
            return {
                fields: fields.join(",\n"),
                from: "\nFROM `" + source.trellis.get_table_name() + '`',
                joins: joins.length > 0 ? "\n" + joins.join("\n") : '',
                filters: filters.length > 0 ? "\nWHERE " + filters.join(" AND ") : '',
                sorts: sorts ? ' ' + sorts : '',
                pager: source.pager ? ' ' + Query_Renderer.render_pager(source.pager) : '',
                args: args,
                reference_hierarchy: data.reference_hierarchy,
                all_references: data.all_references,
                dummy_references: [],
                field_list: data,
                query_id: query_id
            };
        };
        //static render_filter(filter) {
        //  if (typeof filter == 'string') {
        //    return filter
        //  }
        //
        //  if (filter.type == 'or') {
        //    return "(" + filter.filters.map((x)=> Query_Renderer.render_filter(x)).join(" OR ") + ")"
        //  }
        //
        //  return "(" + filter.map((x)=> Query_Renderer.render_filter(x)).join(" AND ") + ")"
        //}
        Query_Renderer.add_path = function (path, trellis, result) {
            var property_chain = Query_Renderer.get_chain(path, trellis);
            return Query_Renderer.add_chain(property_chain, result);
        };
        Query_Renderer.get_chain = function (path, trellis) {
            if (typeof path === 'string') {
                var parts = mining.path_to_array(path);
                var property_chain = mining.Join.path_to_property_chain(trellis, parts);
                var last = property_chain[property_chain.length - 1];
                if (last.other_trellis)
                    property_chain.push(last.other_trellis.get_primary_property());
                return property_chain;
            }
            else {
                return path;
            }
        };
        Query_Renderer.add_chain = function (property_chain, result) {
            var property = property_chain[property_chain.length - 1];
            if (property.get_relationship() == 3 /* many_to_many */ || property_chain.length > 1) {
                result.property_joins = result.property_joins || [];
                result.property_joins.push(property_chain);
            }
            return property_chain;
        };
        Query_Renderer.build_filter = function (source, filter, schema) {
            var result = {
                filters: [],
                arguments: {},
                property_joins: []
            };
            var value = filter.value, operator = filter.operator || '=', reference;
            var placeholder = ':' + filter.path.replace(/\./g, '_') + '_filter' + Query_Renderer.counter++;
            if (Query_Renderer.counter > 10000)
                Query_Renderer.counter = 1;
            var property_chain = Query_Renderer.add_path(filter.path, source.trellis, result);
            var property = property_chain[property_chain.length - 1];
            if (property.is_virtual) {
                reference = property.query_virtual();
                if (!reference)
                    throw new Error("Cannot create filter with invalid virtual property: " + property.name + ".");
            }
            else if (property.get_relationship() == 3 /* many_to_many */ || property_chain.length > 1) {
                reference = mining.Join.get_end_query(property_chain);
            }
            else {
                reference = property.query();
            }
            var operator_action = mining.Query_Builder.operators[filter.operator];
            if (operator_action && typeof operator_action.render === 'function') {
                var data = {
                    value: value,
                    operator: operator,
                    placeholder: placeholder,
                    reference: reference
                };
                operator_action.render(result, filter, property, data);
                value = data.value;
                placeholder = data.placeholder;
                operator = data.operator;
                reference = data.reference;
            }
            else {
                if (value === null || (value === 'null' && property.type != 'string')) {
                    //        result.filters.push(property.query() + ' IS NULL');
                    //        return result;
                    if (!operator || operator == '=')
                        operator = 'IS';
                    else if (operator == '!=')
                        operator = 'IS NOT';
                    value = 'NULL';
                }
                else {
                    if (value !== null)
                        value = schema.convert_value(value, property.type);
                    value = property.get_sql_value(value);
                }
            }
            result.arguments[placeholder] = value;
            result.filters.push(reference + ' ' + operator + ' ' + placeholder);
            return result;
        };
        Query_Renderer.prepare_condition = function (source, condition, schema) {
            var result = {
                filters: [],
                arguments: {},
                property_joins: []
            };
            var value = condition.value, operator = condition.operator || '=';
            var placeholder = ':' + condition.path.join('_') + '_filter' + Query_Renderer.counter++;
            if (Query_Renderer.counter > 10000)
                Query_Renderer.counter = 1;
            var property_chain = Query_Renderer.add_path(condition.path, source.trellis, result);
            var property = property_chain[property_chain.length - 1];
            var reference = mining.Join.get_end_query(property_chain);
            var operator_action = mining.Query_Builder.operators[condition.operator];
            if (operator_action && typeof operator_action.render === 'function') {
                var data = {
                    value: value,
                    operator: operator,
                    placeholder: placeholder,
                    reference: reference
                };
                operator_action.render(result, condition, property, data);
                value = data.value;
                placeholder = data.placeholder;
                operator = data.operator;
                reference = data.reference;
            }
            else {
                if (value === null || (value === 'null' && property.type != 'string')) {
                    //        result.filters.push(property.query() + ' IS NULL');
                    //        return result;
                    if (!operator || operator == '=')
                        operator = 'IS';
                    else if (operator == '!=')
                        operator = 'IS NOT';
                    value = 'NULL';
                }
                else {
                    if (value !== null)
                        value = schema.convert_value(value, property.type);
                    value = property.get_sql_value(value);
                }
            }
            result.arguments[placeholder] = value;
            result.filters.push(reference + ' ' + operator + ' ' + placeholder);
            return result;
        };
        Query_Renderer.build_filters = function (source, filters, schema, is_root, mode) {
            if (mode === void 0) { mode = 'and'; }
            var result = {
                filters: [],
                arguments: {},
                property_joins: []
            };
            for (var i in filters) {
                var filter = filters[i];
                var additions = typeof filter.type == 'string' && (filter.type == 'and' || filter.type == 'or') ? Query_Renderer.build_filters(source, filter.filters, schema, false, filter.type) : Query_Renderer.build_filter(source, filter, schema);
                Query_Renderer.merge_additions(result, additions);
            }
            if (!is_root && result.filters.length > 0) {
                var joiner = " " + mode.toUpperCase() + " ";
                result.filters = ["(" + result.filters.join(joiner) + ")"];
            }
            return result;
        };
        Query_Renderer.merge_additions = function (original, additions) {
            if (additions.filters.length)
                original.filters = original.filters.concat(additions.filters);
            if (additions.property_joins.length)
                original.property_joins = original.property_joins.concat(additions.property_joins);
            if (Object.keys(additions.arguments).length)
                MetaHub.extend(original.arguments, additions.arguments);
            return original;
        };
        Query_Renderer.render_sorts = function (source, result) {
            var sorts = source.sorts;
            var trellis = source.trellis;
            if (sorts.length == 0)
                return '';
            var properties = trellis.get_all_properties();
            var items = sorts.map(function (sort) {
                var sql;
                if (sort.path) {
                    var property_chain = Query_Renderer.add_path(sort.path, trellis, result);
                    var property = property_chain[property_chain.length - 1];
                    sql = property.is_virtual ? property.get_field_name() : mining.Join.get_end_query(property_chain);
                }
                else {
                    if (!properties[sort.property])
                        throw new Error(trellis.name + ' does not contain sort property: ' + sort.property);
                    sql = properties[sort.property].query();
                }
                if (typeof sort.dir === 'string') {
                    var dir = sort.dir.toUpperCase();
                    if (dir == 'ASC')
                        sql += ' ASC';
                    else if (dir == 'DESC')
                        sql += ' DESC';
                }
                return sql;
            });
            return items.length > 0 ? 'ORDER BY ' + items.join(', ') : '';
        };
        Query_Renderer.render_pager = function (pager) {
            var offset = Math.round(pager.offset);
            var limit = Math.round(pager.limit);
            if (!offset) {
                if (!limit)
                    return '';
                else
                    return ' LIMIT ' + limit;
            }
            else {
                if (!limit)
                    limit = 18446744073709551615;
                return ' LIMIT ' + offset + ', ' + limit;
            }
        };
        Query_Renderer.counter = 1;
        return Query_Renderer;
    })();
    mining.Query_Renderer = Query_Renderer;
})(mining || (mining = {}));
var mining;
(function (mining) {
    var Scope = (function () {
        function Scope(parent) {
            if (parent === void 0) { parent = null; }
            this.symbols = {};
            this.constraints = {};
            this.parent = parent;
        }
        Scope.prototype.add_symbol = function (name, value) {
            this.symbols[name] = value;
        };
        Scope.prototype.get_symbol = function (name) {
            if (this.symbols[name] !== undefined)
                return this.symbols[name];
            if (this.parent)
                return this.parent.get_symbol(name);
            throw new Error('Symbol not found: ' + name + '.');
        };
        Scope.prototype.get_constraint = function (name) {
            if (this.constraints[name] !== undefined)
                return this.constraints[name];
            if (this.parent)
                return this.parent.get_constraint(name);
            throw new Error('Constraint not found: ' + name + '.');
        };
        return Scope;
    })();
    mining.Scope = Scope;
})(mining || (mining = {}));
/// <reference path="Logic.ts"/>
var mining;
(function (mining) {
    var Expression_Types = [
        'value',
        'function'
    ];
    //  export interface Expression_Function extends Expression {
    //    name:string
    //    args:any[]
    //  }
    var Expression_Engine = (function () {
        function Expression_Engine() {
        }
        Expression_Engine.resolve = function (expression, context) {
            if (typeof expression === 'string') {
                if (typeof expression === 'string' && context.properties[expression] !== undefined) {
                    return context.properties[expression];
                }
            }
            else if (expression && typeof expression === 'object') {
                if (expression.type == 'function') {
                    return Expression_Engine.resolve_function(expression, context);
                }
                if (expression.type == 'literal') {
                    return expression.value;
                }
            }
        };
        Expression_Engine.resolve_function = function (expression, context) {
            if (expression.name == 'sum') {
            }
        };
        return Expression_Engine;
    })();
    mining.Expression_Engine = Expression_Engine;
})(mining || (mining = {}));
/// <reference path="Query_Builder.ts"/>
/// <reference path="./metahub/Expression.ts"/>
var mining;
(function (mining) {
    var Query_Runner = (function () {
        function Query_Runner(source, miner) {
            this.source = source;
            this.miner = miner;
            this.renderer = new mining.Query_Renderer(miner.schema);
        }
        Query_Runner.generate_property_join = function (property, seeds) {
            var join = mining.Link_Trellis.create_from_property(property);
            return join.generate_join(seeds);
        };
        Query_Runner.create_sub_query = function (trellis, property, source) {
            var query = new mining.Query_Builder(trellis, source.schema);
            var original_query = source.subqueries[property.name];
            if (original_query) {
                MetaHub.extend(query.subqueries, original_query.subqueries);
                if (original_query.source)
                    query.extend(original_query.source);
            }
            else if (typeof source.properties === 'object' && typeof source.properties[property.name] === 'object') {
                query.extend(source.properties[property.name]);
            }
            query.include_links = false;
            return query;
        };
        Query_Runner.get_many_list = function (seed, property, relationship, source, query_result, miner) {
            var id = seed[property.parent.primary_key];
            if (id === undefined || id === null) {
                return when.resolve({
                    objects: []
                });
            }
            //throw new Error('Cannot get many-to-many list when seed id is null for property ' + property.fullname())
            var other_property = property.get_other_property();
            if (!other_property)
                throw new Error("Could not find other property for " + property.fullname() + ".");
            //        return when.resolve()
            var query = Query_Runner.create_sub_query(other_property.parent, property, source);
            //      if (relationship === landscape.Relationships.many_to_many) {
            ////        query.filters.push(Query_Builder.create_join_filter(property, seed))
            //        query.add_filter(property.name, seed)
            //      }
            //      else if (relationship === landscape.Relationships.one_to_many)
            //        query.add_filter(other_property.name, id)
            query.add_filter(other_property.name, id);
            return query.run(query_result.user, miner, query_result);
        };
        Query_Runner.get_reference_object = function (row, property, source, query_result, miner) {
            var query = Query_Runner.create_sub_query(property.other_trellis, property, source);
            var value = row[property.name];
            if (!value)
                return when.resolve(value);
            query.add_key_filter(value);
            return query.run(query_result.user, miner, query_result).then(function (result) { return result.objects[0]; });
        };
        Query_Runner.prototype.process_map = function (row, source, links, query_result) {
            var replacement = undefined;
            var all_properties = source.trellis.get_all_properties();
            var context = {
                //          properties: source.trellis.get_all_properties()
                properties: row
            };
            for (var i in source.map) {
                var expression = source.map[i];
                var value = mining.Expression_Engine.resolve(expression, context);
                if (i == 'this') {
                    replacement = value;
                    break;
                }
                if (value !== undefined)
                    row[i] = value;
            }
            return replacement;
        };
        Query_Runner.prototype.get_inherited_trellis = function (row, trellis) {
            var type_property = trellis.type_property;
            return type_property && row[type_property.name] ? this.miner.schema.get_trellis(row[type_property.name]) : trellis;
        };
        Query_Runner.prototype.query_inherited_row = function (row, source, trellis, query_result) {
            if (trellis == source.trellis)
                return when.resolve(row);
            var query = new mining.Query_Builder(trellis, this.miner.schema);
            query.add_key_filter(trellis.get_identity2(row));
            if (source.properties)
                query.properties = source.properties;
            if (source.map)
                query.map = source.map;
            return query.run_single(query_result.user, this.miner, query_result);
        };
        Query_Runner.prototype.process_row_step_one = function (row, source, query_result, parts) {
            var _this = this;
            var trellis = this.get_inherited_trellis(row, source.trellis);
            return this.query_inherited_row(row, source, trellis, query_result).then(function (row) { return _this.process_row_step_two(row, source, trellis, query_result, parts); });
        };
        Query_Runner.prototype.process_row_step_two = function (row, source, trellis, query_result, parts) {
            var _this = this;
            var name, property, replacement = undefined;
            var properties = trellis.get_core_properties();
            for (name in properties) {
                property = properties[name];
                var value = row[property.name];
                if (value === undefined)
                    continue;
                if (property.type == 'json') {
                    if (!value) {
                        row[property.name] = null;
                    }
                    else {
                        var bin = new Buffer(value, 'binary').toString();
                        var json = new Buffer(bin, 'base64').toString('ascii');
                        row[property.name] = JSON.parse(json);
                    }
                }
                else {
                    row[property.name] = this.miner.schema.convert_value(value, property.type);
                }
            }
            for (var i in parts.reference_hierarchy) {
                parts.reference_hierarchy[i].cleanup_entity(row, row);
            }
            var dummy_references = parts.dummy_references;
            if (dummy_references) {
                for (var j in dummy_references) {
                    delete row[dummy_references[j].property.name];
                }
            }
            delete row['_query_id_'];
            var cache = Query_Runner.get_trellis_cache(trellis);
            var promises = MetaHub.map_to_array(cache.links, function (property, name) {
                if (property.is_composite_sub)
                    return null;
                var subquery = source.subqueries[property.name];
                if (property.type == 'list' && (source.include_links || subquery)) {
                    return _this.query_link_property(row, property, source, query_result).then(function (value) {
                        row[name] = value;
                        return row;
                    });
                }
                else if (property.type == 'reference' && subquery) {
                    return _this.process_reference_children(row[property.name], subquery, query_result).then(function () { return row; });
                }
                return null;
            });
            if (typeof source.map === 'object' && Object.keys(source.map).length > 0) {
                replacement = this.process_map(row, source, cache.links, query_result);
            }
            var sequence = require('when/sequence');
            return when.all(promises).then(function () { return sequence(cache.tree.map(function (trellis) { return function () { return _this.miner.messenger.invoke(trellis.name + '.queried', row, _this, query_result); }; })); }).then(function () { return replacement === undefined ? row : replacement; });
        };
        Query_Runner.prototype.process_reference_children = function (child, query, query_result) {
            var _this = this;
            if (!child)
                return when.resolve();
            var promises = [];
            for (name in query.subqueries) {
                var property = query.trellis.get_property(name);
                var subquery = query.subqueries[name];
                promises.push(function () { return property.type == 'list' ? Query_Runner.get_many_list(child, property, property.get_relationship(), subquery, query_result, _this.miner).then(function (result) {
                    child[property.name] = result.objects;
                }) : _this.process_reference_children(child[property.name], subquery, query_result); });
            }
            var sequence = require('when/sequence');
            return sequence(promises);
        };
        Query_Runner.get_trellis_cache = function (trellis) {
            var cache = Query_Runner.trellis_cache[trellis.name];
            if (!cache) {
                Query_Runner.trellis_cache[trellis.name] = cache = {
                    links: trellis.get_all_links(function (p) { return !p.is_virtual; }),
                    tree: trellis.get_tree().filter(function (t) { return !t.is_virtual; })
                };
            }
            return cache;
        };
        Query_Runner.prototype.query_link_property = function (seed, property, source, query_result) {
            var relationship = property.get_relationship();
            switch (relationship) {
                case 1 /* one_to_one */:
                    return Query_Runner.get_reference_object(seed, property, source, query_result, this.miner);
                    break;
                case 2 /* one_to_many */:
                case 3 /* many_to_many */:
                    return Query_Runner.get_many_list(seed, property, relationship, source, query_result, this.miner).then(function (result) { return result ? result.objects : []; });
                    break;
            }
            throw new Error('Could not find relationship: ' + relationship + '.');
        };
        Query_Runner.prototype.prepare = function (query_id) {
            var _this = this;
            if (query_id === void 0) { query_id = undefined; }
            var source = this.source;
            if (this.row_cache)
                return when.resolve(this.row_cache);
            var tree = source.trellis.get_tree().filter(function (t) { return _this.miner.messenger.has_event(t.name + '.query'); });
            var promises = tree.map(function (trellis) { return function () { return _this.miner.messenger.invoke(trellis.name + '.query', source); }; });
            if (this.miner.messenger.has_event('*.query'))
                promises = promises.concat(function () { return _this.miner.messenger.invoke('*.query', source); });
            var is_empty = false;
            if (source.filters) {
                for (var i in source.filters) {
                    var filter = source.filters[i];
                    var operator_action = mining.Query_Builder.operators[filter.operator];
                    if (operator_action && typeof operator_action.prepare === 'function') {
                        if (filter.property) {
                            var property = source.trellis.sanitize_property(filter.property);
                            promises.push(function () { return operator_action.prepare(filter, property).then(function (result) {
                                if (result === false)
                                    is_empty = true;
                            }); });
                        }
                    }
                }
            }
            var sequence = require('when/sequence');
            return sequence(promises).then(function () {
                return is_empty ? null : _this.renderer.generate_parts(source, query_id);
            });
        };
        Query_Runner.prototype.render = function (parts) {
            var _this = this;
            if (!parts)
                return when.resolve(null);
            var source = this.source;
            return this.miner.messenger.invoke(source.trellis.name + '.query.sql', parts, source).then(function () { return source.type == 'union' ? _this.render_union(parts) : when.resolve({ sql: _this.renderer.generate_sql(parts, source), queries: [] }); }).then(function (render_result) {
                var sql = render_result.sql;
                sql = sql.replace(/\r/g, "\n");
                //if (this.schema.log_queries)
                //  console.log('\nquery', sql + '\n')
                return {
                    sql: sql,
                    parts: parts,
                    queries: render_result.queries,
                    parts_list: render_result.parts_list
                };
            });
        };
        Query_Runner.prototype.render_union = function (parts) {
            var _this = this;
            var sequence = require('when/sequence');
            var queries = [];
            var query_index = 0;
            var runner_parts = [];
            var promises = this.source.queries.map(function (query) { return function () {
                var runner = new Query_Runner(query, _this.miner);
                if (_this.source.pager && _this.source.pager.limit) {
                    query.pager = {
                        limit: (_this.source.pager.limit || 0) + (_this.source.pager.offset || 0)
                    };
                }
                return runner.prepare(query_index++).then(function (parts) {
                    runner_parts.push({
                        runner: runner,
                        parts: parts
                    });
                });
            }; }).concat(function () { return when.resolve(_this.normalize_union_fields(runner_parts)); }).concat(function () { return sequence(runner_parts.map(function (runner_part) { return function () {
                return runner_part.runner.render(runner_part.parts).then(function (render_result) {
                    queries.push(render_result.sql);
                });
            }; })); });
            return sequence(promises).then(function () {
                //console.log('runner_parts', runner_parts.length)
                var parts_list = [];
                for (var i = 0; i < runner_parts.length; ++i) {
                    //parts_list[runner_parts[i].parts.query_id] = runner_parts[i].parts
                    parts_list.push(runner_parts[i].parts);
                }
                return {
                    sql: _this.renderer.generate_union(parts, queries, _this.source),
                    queries: queries,
                    parts_list: parts_list
                };
            });
        };
        Query_Runner.hack_field_alias = function (field) {
            var match = field.match(/\w+`?\s*$/);
            if (!match)
                throw new Error("Could not find alias in field SQL: " + field);
            return match[0].replace(/\s*`/g, '');
        };
        Query_Runner.prototype.normalize_union_fields = function (runner_parts) {
            var field_lists = runner_parts.map(function (x) { return x.parts.field_list; });
            var field_list_length = field_lists.length;
            var field_names = ['_query_id_'];
            var aliases = [];
            for (var i = 0; i < field_list_length; ++i) {
                var field_list = field_lists[i];
                var alias_list = {};
                for (var f in field_list.fields) {
                    var field = field_list.fields[f];
                    var alias = Query_Runner.hack_field_alias(field);
                    alias_list[alias] = field;
                    if (field_names.indexOf(alias) == -1)
                        field_names.push(alias);
                }
                aliases.push(alias_list);
            }
            field_names = field_names.sort();
            for (var i = 0; i < field_list_length; ++i) {
                var field_list = field_lists[i];
                var alias_list = aliases[i];
                var parts = runner_parts[i].parts;
                parts.dummy_references = field_names.filter(function (name) { return alias_list[name] == undefined; });
                //console.log('dummy', parts.dummy_references)
                parts.fields = field_names.map(function (name) { return alias_list[name] || 'NULL AS `' + name + '`'; }).join(',\n');
            }
        };
        Query_Runner.prototype.get_source = function (row) {
            if (this.source.type !== 'union')
                return this.source;
            return this.source.queries[row._query_id_];
        };
        Query_Runner.prototype.get_parts = function (row, render_result) {
            if (this.source.type !== 'union')
                return render_result.parts;
            return render_result.parts_list[row._query_id_];
        };
        Query_Runner.prototype.run = function (query_result) {
            //if (this.miner.schema.log_queries) {
            //  var temp = new Error()
            //  this.run_stack = temp['stack']
            //}
            var _this = this;
            return this.prepare().then(function (parts) { return _this.render(parts); }).then(function (render_result) {
                if (!render_result.sql)
                    return when.resolve([]);
                return _this.miner.db.query(render_result.sql).then(function (rows) {
                    var result = {
                        objects: rows
                    };
                    //this.row_cache = result
                    //if (query_result.return_sql)
                    //  result.sql = render_result.sql
                    return _this.paging(render_result, result).then(function (result) { return when.all(result.objects.map(function (row) { return _this.process_row_step_one(row, _this.get_source(row), query_result, _this.get_parts(row, render_result)); })).then(function (rows) {
                        result.objects = rows;
                        result.query_stats = { count: query_result.query_count };
                        return result;
                    }); });
                });
            });
        };
        Query_Runner.prototype.paging = function (render_result, result) {
            if (!this.source.pager)
                return when.resolve(result);
            var sql = this.source.type != 'union' ? this.renderer.generate_count(render_result.parts) : this.renderer.generate_union_count(render_result.parts, render_result.queries, this.source);
            //if (this.schema.log_queries)
            //  console.log('\nquery', sql + '\n')
            return this.miner.db.query_single(sql).then(function (count) {
                result['total'] = count.total_number;
                return result;
            });
        };
        Query_Runner.prototype.run_single = function (query_result) {
            return this.run(query_result).then(function (result) { return result.objects[0]; });
        };
        Query_Runner.trellis_cache = {};
        return Query_Runner;
    })();
    mining.Query_Runner = Query_Runner;
})(mining || (mining = {}));
/// <reference path="Miner.ts"/>
/// <reference path="Query_Renderer.ts"/>
/// <reference path="Query_Runner.ts"/>
var mining;
(function (mining) {
    function generate_operator_map() {
        var like = {
            "render": function (result, filter, property, data) {
                if (data.value !== null)
                    data.value = "'%" + data.value + "%'";
            }
        };
        var in_operator = {
            "render": function (result, filter, property, data) {
                var values = data.value.map(function (v) { return property.get_sql_value(v); });
                data.value = "(" + values.join(', ') + ")";
            },
            "validate": function (value, path, query) {
                return MetaHub.is_array(value);
            }
        };
        return {
            '=': null,
            'like': like,
            'LIKE': like,
            '!=': null,
            '<': null,
            '>': null,
            '<=': null,
            '>=': null,
            '=>': null,
            '=<': null,
            'in': in_operator,
            'IN': in_operator
        };
    }
    var Query_Builder = (function () {
        function Query_Builder(trellis, schema) {
            this.type = 'query';
            this.sorts = [];
            this.include_links = false;
            this.transforms = [];
            this.subqueries = {};
            this.map = {};
            this.queries = undefined; // used for Unions
            this.optimized_union = false;
            this.filters = [];
            this.trellis = trellis;
            this.schema = schema;
        }
        Query_Builder.create = function (schema, source) {
            if (source === void 0) { source = null; }
            var trellis = schema.get_trellis(source.trellis);
            var result = new Query_Builder(trellis, schema);
            result.extend(source);
            return result;
        };
        Query_Builder.add_operator = function (symbol, action) {
            Query_Builder.operators[symbol] = action;
        };
        Query_Builder.prototype.add_filter = function (path, value, operator) {
            if (value === void 0) { value = null; }
            if (operator === void 0) { operator = '='; }
            var operator_entry = Query_Builder.operators[operator];
            if (operator_entry === undefined)
                throw new Error("Invalid operator: '" + operator + "'.");
            if (operator_entry && typeof operator_entry.validate === 'function') {
                if (!operator_entry.validate(value, path, this))
                    throw new Error('Invalid value for filtering ' + path + ' using operator "' + operator + '".');
            }
            else if (value === undefined) {
                throw new Error('Cannot add property filter where value is undefined; property = ' + this.trellis.name + '.' + path + '.');
            }
            var filter = {
                path: path,
                value: value,
                operator: operator
            };
            if (path.indexOf('.') === -1) {
                var properties = this.trellis.get_all_properties();
                filter.property = properties[path];
                if (!filter.property) {
                    throw new mining.InputError('Invalid filter path.  landscape.Trellis ' + this.trellis.name + ' does not have a property named "' + path + '.');
                }
            }
            this.filters.push(filter);
        };
        Query_Builder.prototype.create_filter = function (source) {
            var _this = this;
            if (source.type == "or" || source.type == "and") {
                return {
                    type: source.type,
                    filters: source.filters.map(function (x) { return _this.create_filter(x); })
                };
            }
            else {
                var operator = source.operator || '=';
                if (Query_Builder.operators[operator] === undefined)
                    throw new Error("Invalid operator: '" + operator + "'.");
                if (source.value === undefined) {
                    throw new Error('Cannot add property filter where value is undefined; property = ' + this.trellis.name + '.' + source.path + '.');
                }
                var filter = {
                    path: source.path,
                    value: source.value,
                    operator: operator
                };
                return filter;
            }
        };
        Query_Builder.prototype.add_key_filter = function (value) {
            this.add_filter(this.trellis.primary_key, value);
        };
        Query_Builder.prototype.add_sort = function (sort) {
            this.sorts.push(sort);
        };
        Query_Builder.prototype.add_map = function (target, source) {
            if (source === void 0) { source = null; }
            this.map[target] = source;
        };
        Query_Builder.prototype.add_query = function (source) {
            var trellis = this.schema.get_trellis(source.trellis);
            var query = new Query_Builder(trellis, this.schema);
            this.queries = this.queries || [];
            this.queries.push(query);
            query.extend(source);
            return query;
        };
        Query_Builder.prototype.add_subquery = function (property_name, source) {
            if (source === void 0) { source = null; }
            var properties = this.trellis.get_all_properties();
            var property = properties[property_name];
            if (!property)
                throw new Error('Cannot create subquery. ' + this.trellis.name + ' does not have a property named ' + property_name + '.');
            if (!property.other_trellis)
                throw new Error('Cannot create a subquery from ' + property.fullname() + ' it does not reference another trellis.');
            var query = this.subqueries[property_name];
            if (!query) {
                query = new Query_Builder(property.other_trellis, this.schema);
                query.include_links = false;
                this.subqueries[property_name] = query;
            }
            query.extend(source);
            return query;
        };
        Query_Builder.prototype.add_transform_clause = function (clause) {
            this.transforms.push({
                clause: clause
            });
        };
        Query_Builder.prototype.create_runner = function (miner) {
            return new mining.Query_Runner(this, miner);
        };
        Query_Builder.create_join_filter = function (property, seed) {
            var value = property.parent.get_identity(seed);
            if (value === undefined || value === null)
                throw new Error(property.fullname() + ' could not get a valid identity from the provided seed.');
            var other_property = property.get_other_property(true);
            return {
                path: other_property.name,
                property: other_property,
                value: value,
                operator: '='
            };
        };
        Query_Builder.prototype.extend = function (source) {
            if (!source)
                return;
            if (typeof source.type === 'string')
                this.type = source.type;
            var i;
            this.source = source;
            if (source.filters) {
                for (i = 0; i < source.filters.length; ++i) {
                    var filter = source.filters[i];
                    //this.add_filter(filter.path || filter.property, filter.value, filter.operator)
                    this.filters.push(this.create_filter(filter));
                }
            }
            //if (source.condition) {
            //  this.condition = this.create_condition(source.condition)
            //}
            if (source.sorts) {
                for (i = 0; i < source.sorts.length; ++i) {
                    this.add_sort(source.sorts[i]);
                }
            }
            if (source.pager) {
                this.pager = source.pager;
            }
            if (source.range) {
                this.pager = {
                    offset: source.range.start,
                    limit: source.range.length
                };
            }
            if (source.type === 'union') {
                for (i = 0; i < source.queries.length; ++i) {
                    this.add_query(source.queries[i]);
                }
            }
            else if (source.properties) {
                this.add_properties(source.properties);
            }
            if (typeof source.subqueries == 'object') {
                for (i in source.subqueries) {
                    this.add_subquery(i, source.subqueries[i]);
                }
            }
            if (typeof source.map == 'object') {
                for (i in source.map) {
                    this.add_map(i, source.map[i]);
                }
            }
            if (MetaHub.is_array(source.expansions)) {
                this.add_expansions(source.expansions);
            }
        };
        Query_Builder.prototype.add_properties = function (source_properties) {
            var properties = this.trellis.get_all_properties();
            this.properties = this.properties || {};
            for (var i in source_properties) {
                var property = source_properties[i];
                if (typeof property == 'string') {
                    if (!properties[property])
                        throw new Error('Error with overriding query properties: ' + this.trellis.name + ' does not have a property named ' + property + '.');
                    this.properties[property] = {};
                }
                else {
                    var name = property.name || i;
                    if (!properties[name])
                        throw new Error('Error with overriding query properties: ' + this.trellis.name + ' does not have a property named ' + name + '.');
                    if (property)
                        this.properties[name] = property;
                }
            }
            var identities = [this.trellis.properties[this.trellis.primary_key]];
            if (identities[0].composite_properties && identities[0].composite_properties.length > 0) {
                identities = identities.concat(identities[0].composite_properties);
            }
            for (var k in identities) {
                var identity = identities[k];
                if (!this.properties[identity.name])
                    this.properties[identity.name] = {};
            }
        };
        Query_Builder.prototype.add_expansions = function (expansions) {
            for (var i = 0; i < expansions.length; ++i) {
                var expansion = expansions[i];
                var tokens = expansion.split(/[\/\.]/g);
                var subquery = this;
                for (var j = 0; j < tokens.length; ++j) {
                    subquery = subquery.add_subquery(tokens[j], {});
                }
            }
        };
        Query_Builder.prototype.get_primary_key_value = function () {
            var _this = this;
            var filters = this.filters.filter(function (filter) { return filter.path == _this.trellis.primary_key; });
            if (filters.length > 0)
                return filters[0].value;
            return undefined;
        };
        Query_Builder.prototype.get_properties = function () {
            if (this.properties && Object.keys(this.properties).length > 0) {
                var properties = this.trellis.get_all_properties();
                return MetaHub.map(this.properties, function (property, key) { return properties[key]; });
            }
            else {
                return this.trellis.get_all_properties();
            }
        };
        Query_Builder.prototype.get_field_properties = function () {
            var result = {};
            var properties = this.get_properties();
            for (var i in properties) {
                var property = properties[i];
                if (property.type == 'list')
                    continue;
                if (property.is_virtual) {
                    var field = property.get_field_override();
                    if (!field || typeof field.sql != 'string')
                        continue;
                }
                result[property.name] = property;
            }
            return result;
        };
        Query_Builder.prototype.get_field_properties2 = function () {
            var result = [];
            var properties = this.get_properties();
            for (var i in properties) {
                var property = properties[i];
                if (property.type == 'list')
                    continue;
                if (property.is_virtual) {
                    var field = property.get_field_override();
                    if (!field || typeof field.sql != 'string')
                        continue;
                }
                result.push(property);
            }
            return result;
        };
        Query_Builder.prototype.run = function (user, miner, query_result) {
            if (query_result === void 0) { query_result = null; }
            if (!query_result)
                query_result = { query_count: 0, user: user };
            //console.log('query-count', this.trellis.name, query_result.query_count)
            ++query_result.query_count;
            var runner = new mining.Query_Runner(this, miner);
            //      console.log('filters', this.filters)
            return runner.run(query_result);
        };
        Query_Builder.prototype.run_single = function (user, miner, query_result) {
            if (query_result === void 0) { query_result = null; }
            return this.run(user, miner, query_result).then(function (result) { return result.objects[0]; });
        };
        Query_Builder.operators = generate_operator_map();
        return Query_Builder;
    })();
    mining.Query_Builder = Query_Builder;
})(mining || (mining = {}));
/// <reference path="Miner.ts"/>
/// <reference path="Query_Builder.ts"/>
var mining;
(function (mining) {
    var Field_List = (function () {
        function Field_List(source) {
            //all_properties
            this.fields = [];
            this.joins = [];
            this.trellises = {};
            this.reference_hierarchy = [];
            this.all_references = [];
            this.reference_join_count = 0;
            this.source = source;
            //this.all_properties = source.get_properties()
            this.properties = source.get_field_properties();
            this.derived_properties = Field_List.get_derived_properties(source.trellis);
            var name;
            if (source.map && Object.keys(source.map).length > 0) {
                this.map_fields();
            }
            else {
                for (name in this.properties) {
                    this.render_field(this.properties[name]);
                }
            }
            this.generate_ancestor_joins(source);
        }
        Field_List.prototype.generate_ancestor_joins = function (source) {
            var ancestor_joins = [];
            for (name in this.trellises) {
                var trellis = this.trellises[name];
                var join = source.trellis.get_ancestor_join(trellis);
                if (join)
                    ancestor_joins.push(join);
            }
            this.joins = ancestor_joins.concat(this.joins);
        };
        Field_List.prototype.render_field = function (property) {
            var sql = property.is_virtual ? property.query_virtual_field() : property.get_field_query();
            this.fields.push(sql);
            if (property.parent.name != this.source.trellis.name)
                this.trellises[property.parent.name] = property.parent;
            var subquery = this.source.subqueries[property.name];
            if (property.type == 'reference' && subquery) {
                var reference = this.render_reference_fields(property, subquery);
                this.reference_hierarchy.push(reference);
            }
        };
        Field_List.prototype.render_reference_fields = function (property, query, previous) {
            if (previous === void 0) { previous = undefined; }
            var properties = query.get_field_properties2().concat(Field_List.get_derived_properties(property.other_trellis));
            var reference = new mining.Embedded_Reference(property, ++this.reference_join_count, properties, previous);
            this.all_references.push(reference);
            for (var i in properties) {
                var prop = properties[i];
                if (prop.type == 'list')
                    continue;
                var field_sql = reference.render_field(prop);
                if (field_sql)
                    this.fields.push(field_sql);
            }
            this.joins.push(reference.render());
            for (var i in properties) {
                var prop = properties[i];
                if (prop.type == 'reference' && query.subqueries[prop.name]) {
                    var child = this.render_reference_fields(prop, query.subqueries[prop.name], reference.tables[prop.parent.name].second);
                    reference.children.push(child);
                }
            }
            return reference;
        };
        Field_List.prototype.map_fields = function () {
            var source = this.source;
            if (!source.map[source.trellis.primary_key])
                this.render_field(source.trellis.get_primary_keys()[0]);
            for (name in source.map) {
                this.map_field(name);
            }
        };
        Field_List.prototype.get_property = function (name) {
            if (this.properties[name])
                return this.properties[name];
            for (var i = 0; i < this.derived_properties.length; ++i) {
                var property = this.derived_properties[i];
                if (property.name == name)
                    return property;
            }
            return null;
        };
        Field_List.prototype.map_field = function (name) {
            if (!name.match(/^[\w_]+$/))
                throw new Error('Invalid field name for mapping: ' + name + '.');
            var expression = this.source.map[name];
            if (!expression.type) {
                var property = this.get_property(name);
                if (!property)
                    return;
                this.render_field(property);
            }
            else if (expression.type == 'literal') {
                var value = expression.value;
                if (value === null) {
                    value = 'NULL';
                }
                else if (!expression.value.toString().match(/^[\w_]*$/))
                    throw new Error('Invalid mapping value: ' + value + '.');
                if (typeof value === 'object') {
                    value = "'object'";
                }
                else {
                    value = this.source.schema.convert_value(expression.value, typeof expression.value);
                    if (typeof value === 'string')
                        value = "'" + value + "'";
                }
                var sql = value + " AS " + name;
                this.fields.push(sql);
            }
            else if (expression.type == 'reference') {
                var property = this.get_property(expression.path);
                if (!property)
                    return;
                //throw new Error('Invalid map path: ' + expression.path + '.')
                var sql = property.query() + " AS " + name;
                this.fields.push(sql);
            }
        };
        Field_List.get_derived_properties = function (trellis) {
            var result = [];
            for (var i = 0; i < trellis.children.length; ++i) {
                var child = trellis.children[i];
                for (var p in child.properties) {
                    if (p == child.primary_key)
                        continue;
                    var property = child.properties[p];
                    if (property.type != 'list')
                        result.push(property);
                }
                result = result.concat(Field_List.get_derived_properties(child));
            }
            return result;
        };
        return Field_List;
    })();
    mining.Field_List = Field_List;
})(mining || (mining = {}));
/// <reference path="interfaces.ts"/>
var mining;
(function (mining) {
    function get_link_sql_value(link, value) {
        if (this.property)
            return this.property.get_sql_value(value);
        return this.other_property.property.get_other_property(true).get_sql_value(value);
    }
    var Join_Trellis_Wrapper = (function () {
        function Join_Trellis_Wrapper(trellis, alias) {
            if (alias === void 0) { alias = null; }
            this.trellis = trellis;
            var trellis_table_name = trellis ? trellis.get_table_name() : null;
            this.alias = alias || trellis_table_name;
        }
        Join_Trellis_Wrapper.create_using_property = function (trellis, property) {
            var alias = Join.generate_table_name(trellis, property);
            return new Join_Trellis_Wrapper(trellis, alias);
        };
        Join_Trellis_Wrapper.prototype.get_alias = function () {
            return this.alias;
        };
        Join_Trellis_Wrapper.prototype.get_primary_keys = function () {
            return [Join_Property.create_from_property(this.trellis.get_primary_property())];
        };
        Join_Trellis_Wrapper.prototype.get_table_name = function () {
            return this.trellis.get_table_name();
        };
        Join_Trellis_Wrapper.prototype.query_identity = function () {
            return this.get_alias() + '.' + this.trellis.get_primary_property().get_field_name();
        };
        return Join_Trellis_Wrapper;
    })();
    mining.Join_Trellis_Wrapper = Join_Trellis_Wrapper;
    var Cross_Trellis = (function () {
        function Cross_Trellis(property) {
            var field = property.get_field_override();
            this.name = field ? field.other_table : Cross_Trellis.generate_name(property.parent, property.other_trellis);
            // Add the property name in case there are cross joins in both directions
            this.alias = 'cross_' + this.name + '_' + property.name;
            this.properties = Cross_Trellis.create_properties(this, property);
            this.identities = [this.properties[1], this.properties[2]];
        }
        Cross_Trellis.generate_name = function (first, second) {
            var names = [first.get_table_name(), second.get_table_name()];
            var temp = names.sort();
            return temp.join('_');
        };
        Cross_Trellis.get_field_name = function (property) {
            var field = property.get_field_override();
            if (field && field.other_field)
                return field.other_field;
            return property.parent.name;
        };
        Cross_Trellis.prototype.get_primary_keys = function () {
            return this.identities;
        };
        Cross_Trellis.create_properties = function (cross, property) {
            var other_property = property.get_other_property(true);
            var result = [
                Join_Property.create_from_property(property, cross),
                new Join_Property(cross, new Join_Trellis_Wrapper(property.parent), Cross_Trellis.get_field_name(property), "reference"),
                new Join_Property(cross, new Join_Trellis_Wrapper(property.other_trellis), Cross_Trellis.get_field_name(other_property), "reference"),
                Join_Property.create_from_property(other_property, cross)
            ];
            Join_Property.pair(result[0], result[1]);
            Join_Property.pair(result[2], result[3]);
            return result;
        };
        Cross_Trellis.prototype.generate_delete = function (property, owner, other) {
            var identities = this.order_identities(property);
            var conditions = [
                identities[0].get_comparison(owner),
                identities[1].get_comparison(other)
            ];
            return 'DELETE FROM ' + this.get_table_name() + ' WHERE ' + conditions.join(' AND ') + "\n";
        };
        Cross_Trellis.prototype.generate_insert = function (property, owner, other) {
            var identities = this.order_identities(property);
            var keys = identities.map(function (x) { return x.field_name; });
            var values = [
                identities[0].get_sql_value(owner),
                identities[1].get_sql_value(other)
            ];
            return 'REPLACE INTO ' + this.get_table_name() + ' (`' + keys.join('`, `') + '`) VALUES (' + values.join(', ') + ');\n';
        };
        Cross_Trellis.prototype.order_identities = function (property) {
            var first = this.identities.filter(function (x) { return x.other_property.name == property.name; })[0];
            if (!first) {
                throw new Error('Could not insert into cross table ' + this.get_table_name() + '.  Could not find identity for property ' + property.fullname() + '.');
            }
            var second = this.identities[1 - this.identities.indexOf(first)];
            return [first, second];
        };
        Cross_Trellis.prototype.get_alias = function () {
            return this.alias;
        };
        Cross_Trellis.prototype.get_table_name = function () {
            return this.name;
        };
        Cross_Trellis.prototype.query_identity = function () {
            throw new Error('Cross_Trellis.query_identity() should never be called.' + '  Cross_Reference only has references, not identities');
        };
        return Cross_Trellis;
    })();
    mining.Cross_Trellis = Cross_Trellis;
    var Cross_Trellis2 = (function () {
        function Cross_Trellis2(property, schema, alias) {
            if (alias === void 0) { alias = null; }
            this.table = landscape.Table.get_other_table(property, schema);
            this.alias = alias;
        }
        //    generate_delete(property:landscape.Property, owner, other):string {
        //      var identities = this.order_identities(property)
        //      var conditions = [
        //        identities[0].get_comparison(owner),
        //        identities[1].get_comparison(other)
        //      ]
        //      return 'DELETE FROM ' + this.get_table_name() + ' WHERE ' + conditions.join(' AND ') + "\n"
        //    }
        Cross_Trellis2.prototype.generate_insert = function (property, owner, other) {
            var identities = this.order_identities(property);
            var keys = identities.map(function (x) { return x.name; });
            var values = [
                get_link_sql_value(identities[0], owner),
                get_link_sql_value(identities[1], other)
            ];
            return 'REPLACE INTO ' + this.table.name + ' (`' + keys.join('`, `') + '`) VALUES (' + values.join(', ') + ');\n';
        };
        Cross_Trellis2.prototype.order_identities = function (property) {
            var table = this.table;
            var first = MetaHub.filter(table.links, function (x) { return x.name == property.name; })[0];
            if (!first) {
                throw new Error('Could not operate using cross table ' + this.table.name + '.  Could not find identity for property ' + property.fullname() + '.');
            }
            MetaHub.filter(table.links, function (x) { return x.name == property.name; })[0];
            var second = MetaHub.filter(table.links, function (x) { return x.name == property.name; })[0];
            return [first, second];
        };
        return Cross_Trellis2;
    })();
    mining.Cross_Trellis2 = Cross_Trellis2;
    var Join_Property = (function () {
        function Join_Property(parent, other_trellis, name, type, field_name, other_property) {
            if (field_name === void 0) { field_name = null; }
            if (other_property === void 0) { other_property = null; }
            this.parent = parent;
            this.name = name;
            this.other_trellis = other_trellis;
            this.field_name = field_name || name;
            this.type = type;
            this.other_property = other_property;
        }
        Join_Property.create_from_property = function (property, other_trellis, other_property) {
            if (other_trellis === void 0) { other_trellis = null; }
            if (other_property === void 0) { other_property = null; }
            var result = new Join_Property(new Join_Trellis_Wrapper(property.parent), other_trellis || new Join_Trellis_Wrapper(property.other_trellis), property.name, property.type, property.get_field_name(), other_property);
            result.property = property;
            return result;
        };
        Join_Property.prototype.get_comparison = function (value) {
            return this.query() + ' = ' + this.get_sql_value(value);
        };
        Join_Property.prototype.query = function () {
            var table_name = this.parent.get_alias() || this.parent.get_table_name();
            return table_name + '.' + this.field_name;
        };
        Join_Property.pair = function (first, second) {
            first.other_property = second;
            second.other_property = first;
        };
        Join_Property.prototype.get_sql_value = function (value) {
            if (this.property)
                return this.property.get_sql_value(value);
            return this.other_property.property.get_other_property(true).get_sql_value(value);
        };
        return Join_Property;
    })();
    mining.Join_Property = Join_Property;
    var Join_Tree = (function () {
        function Join_Tree(property, trellis) {
            this.children = [];
            this.property = property;
            this.trellis = trellis;
        }
        Join_Tree.get = function (tree, property, next) {
            for (var i = 0; i < tree.length; ++i) {
                var branch = tree[i];
                if (branch.property.name == property.name && branch.trellis.name === next.name)
                    return branch;
            }
            return null;
        };
        return Join_Tree;
    })();
    mining.Join_Tree = Join_Tree;
    var Join = (function () {
        function Join() {
        }
        Join.generate_table_name = function (trellis, property) {
            return 'link_' + trellis.name + '_' + property.get_field_name() + '_' + property.parent.name;
        };
        Join.get_last_reference = function (property_chain) {
            var property = property_chain[property_chain.length - 1];
            // If the last property isn't a reference, the property before it must be a reference
            // or the chain is invalid.
            if (!property.other_property)
                return property_chain[property_chain.length - 2];
        };
        Join.paths_to_tree = function (base, paths) {
            var result = [], target, path;
            for (var i = 0; i < paths.length; ++i) {
                var trellis = base;
                path = paths[i];
                target = result;
                for (var x = 0; x < path.length - 1; ++x) {
                    var property = path[x];
                    var next = path[x + 1].parent;
                    var branch = Join_Tree.get(target, property, next);
                    if (!branch) {
                        branch = new Join_Tree(property, next);
                        target.push(branch);
                    }
                    target = branch.children;
                }
            }
            return result;
        };
        Join.convert = function (branch, previous, result) {
            var join_property, cross, join_trellis;
            if (branch.property.get_relationship() == 3 /* many_to_many */) {
                cross = new Cross_Trellis(branch.property);
                result.push(new Reference_Join(cross.properties[0], previous, cross));
                previous = cross;
                join_property = cross.properties[2];
            }
            else {
                join_property = Join_Property.create_from_property(branch.property);
                Join_Property.pair(join_property, Join_Property.create_from_property(branch.property.get_other_property(true)));
            }
            var other_property = branch.property.get_other_property(true);
            // joined trellises usually require two trellis properties to be useful, and sometimes those properties
            // are not in the same table, so composite join must be added to bridge the gap.
            if (branch.property.type == 'list' && other_property.parent !== branch.trellis) {
                join_trellis = Join_Trellis_Wrapper.create_using_property(branch.trellis, branch.property);
                var alias = 'composite_' + join_trellis.alias + '_' + branch.property.other_trellis.name;
                var join_trellis2 = new Join_Trellis_Wrapper(branch.property.other_trellis, alias);
                result.push(new Reference_Join(join_property, previous, join_trellis2));
                result.push(new Composite_Join(join_trellis2, join_trellis));
                return join_trellis;
            }
            else {
                join_trellis = Join_Trellis_Wrapper.create_using_property(branch.trellis, branch.property);
                result.push(new Reference_Join(join_property, previous, join_trellis));
                return join_trellis;
            }
        };
        Join.tree_to_joins = function (tree, previous) {
            if (previous === void 0) { previous = null; }
            var result = [], base;
            for (var i = 0; i < tree.length; ++i) {
                var branch = tree[i], cross = null;
                if (!previous) {
                    base = new Join_Trellis_Wrapper(branch.property.parent);
                }
                var join_trellis = Join.convert(branch, previous || base, result);
                result = result.concat(Join.tree_to_joins(branch.children, join_trellis));
            }
            return result;
        };
        Join.render_paths = function (trellis, paths) {
            var tree = Join.paths_to_tree(trellis, paths);
            var joins = Join.tree_to_joins(tree);
            return joins.map(function (join) { return join.render(); });
        };
        Join.path_to_property_chain = function (base, path) {
            var parts = mining.path_to_array(path);
            var trellis = base;
            var result = [];
            for (var i = 0; i < parts.length; ++i) {
                var part = parts[i];
                var property = trellis.get_property(part);
                result.push(property);
                trellis = property.other_trellis;
            }
            return result;
        };
        Join.get_end_query = function (property_chain) {
            var last_property = property_chain[property_chain.length - 1];
            if (property_chain.length == 1 && last_property.get_relationship() != 3 /* many_to_many */)
                return last_property.parent.get_table_name() + '.' + last_property.get_field_name();
            var last_reference = Join.get_last_reference(property_chain);
            var table_name = Join.generate_table_name(last_property.parent, last_reference);
            return table_name + '.' + last_property.get_field_name();
        };
        return Join;
    })();
    mining.Join = Join;
    var Reference_Join = (function () {
        function Reference_Join(property, first, second) {
            this.property = property;
            this.first = first;
            this.second = second;
        }
        Reference_Join.prototype.render = function () {
            return 'LEFT JOIN `' + this.second.get_table_name() + '` ' + this.second.get_alias() + ' ON ' + this.get_condition();
        };
        Reference_Join.prototype.get_condition = function () {
            if (this.property.type === 'reference')
                return this.get_query_reference(this.first, this.property) + ' = ' + this.second.query_identity();
            else
                return this.first.query_identity() + ' = ' + this.get_query_reference(this.second, this.property.other_property);
        };
        Reference_Join.prototype.get_query_reference = function (trellis, property) {
            return trellis.get_alias() + '.' + property.field_name;
        };
        return Reference_Join;
    })();
    mining.Reference_Join = Reference_Join;
    var Composite_Join = (function () {
        function Composite_Join(first, second) {
            this.first = first;
            this.second = second;
        }
        Composite_Join.prototype.render = function () {
            return 'LEFT JOIN `' + this.second.get_table_name() + '` ' + this.second.get_alias() + ' ON ' + this.get_condition();
        };
        Composite_Join.prototype.get_condition = function () {
            return this.first.query_identity() + ' = ' + this.second.query_identity();
        };
        return Composite_Join;
    })();
    mining.Composite_Join = Composite_Join;
})(mining || (mining = {}));
/// <reference path="interfaces.ts"/>
/// <reference path="Embedded_Reference.ts"/>
/// <reference path="Field_List.ts"/>
/// <reference path="Join.ts"/>
var MetaHub = require('vineyard-metahub')
var landscape = require('./landscape')
var mining;
(function (mining) {
    var Miner = (function () {
        function Miner(schema, db, messenger) {
            this.schema = schema;
            this.db = db;
            this.messenger = messenger;
        }
        return Miner;
    })();
    mining.Miner = Miner;
})(mining || (mining = {}));
module.exports = mining;
//# sourceMappingURL=mining.js.map