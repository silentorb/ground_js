var Ground;
(function (Ground) {
    var Embedded_Reference = (function () {
        function Embedded_Reference(property, id, properties, previous) {
            if (previous === void 0) { previous = undefined; }
            this.properties = [];
            this.tables = {};
            this.children = [];
            if (!previous)
                previous = new Ground.Join_Trellis_Wrapper(property.parent);
            this.property = property;
            var trellises = {};
            for (var i in properties) {
                var prop = properties[i];
                trellises[prop.parent.name] = prop.parent;
            }
            for (var i in trellises) {
                var trellis = trellises[i];
                this.tables[i] = new Ground.Reference_Join(Ground.Join_Property.create_from_property(property), previous, new Ground.Join_Trellis_Wrapper(trellis, trellis.get_table_name() + '_' + id));
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
    Ground.Embedded_Reference = Embedded_Reference;
})(Ground || (Ground = {}));
var Ground;
(function (Ground) {
    var Field_List = (function () {
        function Field_List(source) {
            this.fields = [];
            this.joins = [];
            this.trellises = {};
            this.reference_hierarchy = [];
            this.all_references = [];
            this.reference_join_count = 0;
            this.source = source;
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
            var reference = new Ground.Embedded_Reference(property, ++this.reference_join_count, properties, previous);
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
    Ground.Field_List = Field_List;
})(Ground || (Ground = {}));
function get_link_sql_value(link, value) {
    if (this.property)
        return this.property.get_sql_value(value);
    return this.other_property.property.get_other_property(true).get_sql_value(value);
}
var Ground;
(function (Ground) {
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
    Ground.Join_Trellis_Wrapper = Join_Trellis_Wrapper;
    var Cross_Trellis = (function () {
        function Cross_Trellis(property) {
            var field = property.get_field_override();
            this.name = field ? field.other_table : Cross_Trellis.generate_name(property.parent, property.other_trellis);
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
    Ground.Cross_Trellis = Cross_Trellis;
    var Cross_Trellis2 = (function () {
        function Cross_Trellis2(property, schema, alias) {
            if (alias === void 0) { alias = null; }
            this.table = Ground.Table.get_other_table(property, schema);
            this.alias = alias;
        }
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
    Ground.Cross_Trellis2 = Cross_Trellis2;
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
    Ground.Join_Property = Join_Property;
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
    Ground.Join_Tree = Join_Tree;
    var Join = (function () {
        function Join() {
        }
        Join.generate_table_name = function (trellis, property) {
            return 'link_' + trellis.name + '_' + property.get_field_name() + '_' + property.parent.name;
        };
        Join.get_last_reference = function (property_chain) {
            var property = property_chain[property_chain.length - 1];
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
            var parts = Ground.path_to_array(path);
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
    Ground.Join = Join;
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
    Ground.Reference_Join = Reference_Join;
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
    Ground.Composite_Join = Composite_Join;
})(Ground || (Ground = {}));
var Ground;
(function (Ground) {
    var Miner = (function () {
        function Miner(schema, db, messenger) {
            this.schema = schema;
            this.db = db;
            this.messenger = messenger;
        }
        return Miner;
    })();
    Ground.Miner = Miner;
})(Ground || (Ground = {}));
//# sourceMappingURL=miner.js.map