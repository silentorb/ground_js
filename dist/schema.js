var Ground;
(function (Ground) {
    var Property_Type = (function () {
        function Property_Type(name, info, types) {
            this.allow_null = false;
            if (info.parent) {
                var parent = types[info.parent];
                MetaHub.extend(this, parent);
                this.parent = parent;
            }
            this.field_type = info.field_type || null;
            this.name = name;
            this.property_class = 'Property';
            if (info.default !== undefined)
                this.default_value = info.default;
            if (info.allow_null !== undefined)
                this.allow_null = info.allow_null;
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
})(Ground || (Ground = {}));
var Ground;
(function (Ground) {
    (function (Relationships) {
        Relationships[Relationships["none"] = 0] = "none";
        Relationships[Relationships["one_to_one"] = 1] = "one_to_one";
        Relationships[Relationships["one_to_many"] = 2] = "one_to_many";
        Relationships[Relationships["many_to_many"] = 3] = "many_to_many";
    })(Ground.Relationships || (Ground.Relationships = {}));
    var Relationships = Ground.Relationships;
    var Property = (function () {
        function Property(name, source, trellis) {
            this.name = null;
            this.parent = null;
            this.type = null;
            this.insert = null;
            this.other_property = null;
            this.other_trellis = null;
            this.other_trellis_name = null;
            this.is_private = false;
            this.is_parent = false;
            this.is_readonly = false;
            this.is_virtual = false;
            this.is_composite_sub = false;
            this.is_unique = false;
            this.composite_properties = null;
            this.access = 'auto';
            this.allow_null = false;
            for (var i in source) {
                if (this.hasOwnProperty(i))
                    this[i] = source[i];
            }
            if (source['default'] !== undefined)
                this.default = source['default'];
            if (typeof source['allow_null'] == 'boolean')
                this.allow_null = source['allow_null'];
            if (source.trellis) {
                this.other_trellis_name = source.trellis;
            }
            this.name = name;
            this.parent = trellis;
        }
        Property.prototype.initialize_composite_reference = function (other_trellis) {
        };
        Property.prototype.fullname = function () {
            return this.parent.name + '.' + this.name;
        };
        Property.prototype.get_allow_null = function () {
            if (this.allow_null !== undefined)
                return this.allow_null;
            var type = this.get_property_type();
            if (type && type.allow_null !== undefined)
                return type.allow_null;
            return false;
        };
        Property.prototype.get_composite = function () {
            if (this.composite_properties)
                return [this].concat(this.composite_properties);
            return [this];
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
            if (this.other_property)
                result.other_property = this.other_property;
            return result;
        };
        Property.prototype.get_default = function () {
            var result;
            if (this.default == undefined && this.parent.parent && this.parent.parent.properties[this.name])
                result = this.parent.parent.properties[this.name].get_default();
            else
                result = this.default;
            if (result === undefined) {
                var type = this.get_property_type();
                if (type)
                    result = type.default_value;
            }
            return result;
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
            if (create_if_missing === void 0) { create_if_missing = false; }
            var table = this.parent.table;
            if (!table) {
                if (!create_if_missing)
                    return null;
                table = Ground.Table.create_from_trellis(this.parent, this.parent.schema);
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
        Property.prototype.get_seed_name = function () {
            if (this.is_composite_sub)
                return this.other_property;
            else
                return this.name;
        };
        Property.prototype.get_sql_value = function (value, type, is_reference) {
            if (type === void 0) { type = null; }
            if (is_reference === void 0) { is_reference = false; }
            type = type || this.type;
            if (type == 'json') {
                var json = JSON.stringify(value);
                var base64 = new Buffer(json).toString('base64');
                var bin = new Buffer(base64, "binary").toString();
                return "'" + bin + "'";
            }
            var property_type = this.parent.schema.property_types[type];
            if (value === undefined || value === null) {
                value = this.get_default();
                if (value === undefined || value === null) {
                    if (!this.get_allow_null() && !is_reference)
                        throw new Error(this.fullname() + ' does not allow null values.');
                }
            }
            if (property_type && property_type.parent)
                return this.get_sql_value(value, property_type.parent.name, is_reference);
            if (this.parent.primary_key == this.name && this.type != 'reference') {
                value = this.parent.get_identity2(value);
            }
            switch (type) {
                case 'guid':
                    if (!value)
                        return 'NULL';
                    return "UNHEX('" + value.toUpperCase().replace(/[^A-Z0-9]/g, '') + "')";
                case 'list':
                case 'reference':
                    var other_primary_property = this.other_trellis.properties[this.other_trellis.primary_key];
                    if (value && typeof value === 'object') {
                        value = value[this.other_trellis.primary_key];
                        if (!value)
                            return null;
                    }
                    return other_primary_property.get_sql_value(value, null, true);
                case 'int':
                    if (!value)
                        return 0;
                    if (typeof value === 'string' && !value.match(/^-?\d+$/))
                        throw new Error(this.fullname() + ' expected an integer but recieved: ' + value);
                    return Math.round(value);
                case 'string':
                case 'text':
                    if (!value)
                        return "''";
                    if (typeof value !== 'string')
                        value = value.toString();
                    value = value.replace(/'/g, "\\'", value);
                    return "'" + value.replace(/[\r\n]+/, "\n") + "'";
                case 'bool':
                    return value ? 'TRUE' : 'FALSE';
                case 'float':
                case 'double':
                    if (!value)
                        return 0;
                    var num = parseFloat(value);
                    if (num == NaN)
                        throw new Error(this.fullname() + ' expected an integer but recieved: ' + value);
                    return num;
                case 'money':
                    if (typeof value !== 'number')
                        return parseFloat(value.toString());
                case 'date':
                case 'time':
                    if (typeof value == 'string') {
                        var date = new Date(value);
                        return "'" + date.toISOString().slice(0, 19).replace('T', ' ') + "'";
                    }
                    else if (typeof value == 'number') {
                        var date = new Date(value * 1000);
                        return "'" + date.toISOString().slice(0, 19).replace('T', ' ') + "'";
                    }
            }
            throw new Error('Ground is not configured to process property types of ' + type + ' (' + this.type + ')');
        };
        Property.prototype.get_type = function () {
            if (this.type == 'reference' || this.type == 'list') {
                return this.other_trellis.properties[this.other_trellis.primary_key].type;
            }
            return this.type;
        };
        Property.prototype.get_other_id = function (entity) {
            var value = entity[this.other_trellis.primary_key];
            if (value === undefined)
                value = null;
            return value;
        };
        Property.prototype.get_other_property = function (create_if_none) {
            if (create_if_none === void 0) { create_if_none = false; }
            var property;
            if (this.other_property) {
                var properties = this.other_trellis.get_all_properties();
                var other_property = properties[this.other_property];
                if (!other_property) {
                    throw new Error('Invalid other property in ' + this.get_field_name() + ": " + this.other_trellis.name + '.' + this.other_property + ' does not exist.');
                }
                return other_property;
            }
            else {
                if (!this.other_trellis) {
                    if (create_if_none)
                        throw new Error("Attempt to get other property for " + this.get_field_name() + " but its other_trellis is null.");
                    return null;
                }
                for (var name in this.other_trellis.properties) {
                    property = this.other_trellis.properties[name];
                    if (property.other_trellis === this.parent) {
                        return property;
                    }
                }
            }
            if (this.other_trellis === this.parent) {
                if (create_if_none)
                    return this;
                return null;
            }
            if (!create_if_none)
                return null;
            var attributes = {};
            attributes.type = 'list';
            attributes.is_virtual = true;
            attributes.trellis = this.parent.name;
            var result = new Property(this.other_trellis.name, attributes, this.other_trellis);
            result.other_trellis = this.parent;
            return result;
        };
        Property.prototype.get_property_type = function () {
            var types = this.parent.schema.property_types;
            if (types[this.type] !== undefined)
                return types[this.type];
            return null;
        };
        Property.prototype.get_referenced_trellis = function () {
            return this.other_trellis;
        };
        Property.prototype.get_relationship = function () {
            if (this.type != 'list' && this.type != 'reference')
                return 0 /* none */;
            var field = this.get_field_override();
            if (field && field.relationship) {
                return Relationships[field.relationship];
            }
            var other_property = this.get_other_property();
            if (!other_property) {
                if (this.type == 'list')
                    return 2 /* one_to_many */;
                else
                    return 1 /* one_to_one */;
            }
            if (this.type == 'list') {
                if (other_property.type == 'list')
                    return 3 /* many_to_many */;
                else
                    return 2 /* one_to_many */;
            }
            return 1 /* one_to_one */;
        };
        Property.prototype.get_field_query = function () {
            var field_name = this.get_field_name();
            var sql = this.query();
            var type = this.get_type();
            if (type == 'guid')
                sql = this.format_guid(sql) + " AS `" + this.name + '`';
            else if (field_name != this.name)
                sql += ' AS `' + this.name + '`';
            return sql;
        };
        Property.prototype.format_guid = function (name) {
            return "INSERT(INSERT(INSERT(INSERT(HEX(" + name + ")" + ",9,0,'-')" + ",14,0,'-')" + ",19,0,'-')" + ",24,0,'-')";
        };
        Property.prototype.get_field_query2 = function (input_name, output_name) {
            if (output_name === void 0) { output_name = null; }
            output_name = output_name || this.name;
            var type = this.get_type();
            if (type == 'guid')
                input_name = this.format_guid(input_name);
            var sql = input_name;
            if (input_name != output_name)
                sql += ' AS `' + output_name + '`';
            return sql;
        };
        Property.prototype.query = function () {
            return '`' + this.parent.get_table_name() + '`.' + this.get_field_name();
        };
        Property.prototype.query_virtual = function (table_name) {
            if (table_name === void 0) { table_name = null; }
            table_name = table_name || this.parent.get_table_query();
            var field = this.get_field_override();
            if (field) {
                var sql = null;
                if (MetaHub.is_array(field.sql))
                    var sql = field['sql'].join("\n");
                if (typeof field.sql == 'string')
                    sql = field.sql;
                if (sql)
                    return sql.replace(/@trellis@/g, table_name);
            }
            return null;
        };
        Property.prototype.query_virtual_field = function (table_name, output_name) {
            if (table_name === void 0) { table_name = null; }
            if (output_name === void 0) { output_name = null; }
            var field_sql = this.query_virtual(table_name);
            return field_sql != null ? field_sql + ' AS ' + (output_name || this.get_field_name()) : null;
        };
        Property.prototype.export_schema = function () {
            var result = {
                type: this.type
            };
            if (this.other_trellis)
                result.trellis = this.other_trellis.name;
            if (this.is_virtual)
                result.is_virtual = true;
            if (this.insert)
                result.insert = this.insert;
            if (this.is_readonly)
                result.is_readonly = true;
            if (this.default !== undefined)
                result['default'] = this.default;
            if (this.allow_null)
                result.allow_null = true;
            if (this.other_property)
                result.other_property = this.other_property;
            return result;
        };
        return Property;
    })();
    Ground.Property = Property;
})(Ground || (Ground = {}));
var Ground;
(function (Ground) {
    var Trellis = (function () {
        function Trellis(name, schema) {
            this.parent = null;
            this.table = null;
            this.name = null;
            this.primary_key = 'id';
            this.is_virtual = false;
            this.children = [];
            this.properties = {};
            this.all_properties = null;
            this.core_properties = null;
            this.schema = schema;
            this.name = name;
        }
        Trellis.prototype.add_property = function (name, source) {
            var property = new Ground.Property(name, source, this);
            this.properties[name] = property;
            if (property.insert == 'trellis' && !this.type_property)
                this.type_property = property;
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
            if (filter === void 0) { filter = null; }
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
            if (this.all_properties)
                return this.all_properties;
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
        Trellis.prototype.get_property = function (name) {
            var properties = this.get_all_properties();
            var property = properties[name];
            if (!property)
                throw new Error('Trellis ' + this.name + ' does not contain a property named ' + name + '.');
            return property;
        };
        Trellis.prototype.get_core_properties = function () {
            if (this.core_properties)
                return this.core_properties;
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
        Trellis.prototype.get_identity = function (seed) {
            var composite = this.properties[this.primary_key].get_composite().filter(function (x) { return seed[x.name] !== undefined; });
            var result = {};
            for (var i in composite) {
                var c = composite[i];
                result[c.name] = seed[c.name];
            }
            return result;
        };
        Trellis.prototype.get_identity2 = function (value) {
            if (typeof value == 'object')
                return value[this.primary_key];
            return value;
        };
        Trellis.prototype.get_ancestor_join = function (other) {
            var conditions = this.get_primary_keys().map(function (property) { return property.query() + ' = ' + other.properties[property.name].query(); });
            return 'JOIN ' + other.get_table_query() + ' ON ' + conditions.join(' AND ');
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
        Trellis.prototype.get_primary_property = function () {
            return this.properties[this.primary_key];
        };
        Trellis.prototype.get_reference_property = function (other_trellis) {
            var properties = this.get_all_properties();
            for (var i in properties) {
                var property = properties[i];
                if (property.other_trellis === other_trellis)
                    return property;
            }
            return null;
        };
        Trellis.prototype.get_root_table = function () {
            if (this.parent && this.schema.tables[this.parent.name])
                return this.parent.get_root_table();
            return this.schema.tables[this.name];
        };
        Trellis.prototype.get_table_name = function () {
            if (this.is_virtual) {
                if (this.parent) {
                    return this.parent.get_table_name();
                }
            }
            if (this.table) {
                if (this.table.db_name)
                    return this.table.db_name + '.' + this.table.name;
                else
                    return this.table.name;
            }
            return this.name + 's';
        };
        Trellis.prototype.get_table_query = function () {
            if (this.table && this.table.query)
                return this.table.query;
            return '`' + this.get_table_name() + '`';
        };
        Trellis.prototype.get_tree = function () {
            var trellis = this;
            var tree = [];
            do {
                tree.unshift(trellis);
            } while (trellis = trellis.parent);
            return tree;
        };
        Trellis.prototype.harden = function () {
            if (!this.all_properties)
                this.all_properties = this.get_all_properties();
            if (!this.core_properties)
                this.core_properties = this.get_core_properties();
        };
        Trellis.prototype.initialize = function (all) {
            if (typeof this.parent_name === 'string') {
                if (!all[this.parent_name])
                    throw new Error(this.name + ' references a parent that does not exist: ' + this.parent + '.');
                this.set_parent(all[this.parent_name]);
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
                if (name != 'name' && name != 'properties' && name != 'parent' && this[name] !== undefined && source[name] !== undefined) {
                    this[name] = source[name];
                }
            }
            this.parent_name = source.parent;
            for (name in source.properties) {
                this.add_property(name, source.properties[name]);
            }
        };
        Trellis.prototype.query = function () {
            return this.get_table_query() + '.' + this.properties[this.primary_key].get_field_name();
        };
        Trellis.prototype.query_primary_key = function () {
            return this.query();
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
            if (parent.children.indexOf(this) == -1)
                parent.children.push(this);
            if (!parent.primary_key)
                throw new Error(parent.name + ' needs a primary key when being inherited by ' + this.name + '.');
            var keys;
            if (parent.table && parent.table.primary_keys) {
                keys = parent.table.primary_keys;
                if (!this.table)
                    this.table = Ground.Table.create_from_trellis(this, this.schema);
                this.table.primary_keys = keys;
            }
            else {
                keys = [parent.primary_key];
            }
            for (var i = 0; i < keys.length; ++i) {
                parent.clone_property(keys[i], this);
            }
            this.primary_key = parent.primary_key;
        };
        Trellis.prototype.seed_has_properties = function (seed, properties) {
            return properties.every(function (name) {
                if (name.indexOf('.') > -1) {
                    var current = seed;
                    return name.split('.').every(function (token) {
                        if (typeof current !== 'object' || current[token] === undefined)
                            return false;
                        current = current[token];
                        return true;
                    });
                }
                return seed[name] !== undefined;
            });
        };
        Trellis.prototype.export_schema = function () {
            var result = {};
            if (this.parent)
                result.parent = this.parent.name;
            else if (this.primary_key != 'id')
                result.primary_key = this.primary_key;
            if (this.is_virtual)
                result.is_virtual = true;
            result.properties = MetaHub.map(this.properties, function (property) { return property.export_schema(); });
            return result;
        };
        return Trellis;
    })();
    Ground.Trellis = Trellis;
})(Ground || (Ground = {}));
var Ground;
(function (Ground) {
    (function (Link_Field_Type) {
        Link_Field_Type[Link_Field_Type["identity"] = 0] = "identity";
        Link_Field_Type[Link_Field_Type["reference"] = 1] = "reference";
    })(Ground.Link_Field_Type || (Ground.Link_Field_Type = {}));
    var Link_Field_Type = Ground.Link_Field_Type;
    var Link_Field = (function () {
        function Link_Field(name, parent, other_table, type) {
            this.name = name;
            this.parent = parent;
            this.other_table = other_table;
            this.type = type;
        }
        return Link_Field;
    })();
    Ground.Link_Field = Link_Field;
    var Table = (function () {
        function Table(name, schema) {
            this.properties = {};
            this.links = {};
            this.name = name;
            this.schema = schema;
        }
        Table.prototype.connect_trellis = function (trellis) {
            this.trellis = trellis;
            trellis.table = this;
        };
        Table.create_from_trellis = function (trellis, schema) {
            if (trellis.table)
                return trellis.table;
            var table = new Table(trellis.get_table_name(), schema);
            table.connect_trellis(trellis);
            return table;
        };
        Table.get_other_table = function (property, schema) {
            var name = Table.get_other_table_name(property);
            return schema.tables[name];
        };
        Table.get_other_table_name = function (property) {
            var field = property.get_field_override();
            if (field && field.other_table)
                return field.other_table;
            if (property.get_relationship() === 3 /* many_to_many */)
                return Table.generate_cross_name(property.parent, property.other_trellis);
            return property.other_trellis.name;
        };
        Table.generate_cross_name = function (first, second) {
            var names = [first.get_table_name(), second.get_table_name()];
            var temp = names.sort();
            return temp.join('_');
        };
        Table.prototype.create_link = function (property) {
            var other_table = Table.get_other_table(property, this.schema);
            if (!other_table)
                throw new Error('Could not find other table for ' + property.fullname());
            var type = property.type == 'reference' ? 1 /* reference */ : 0 /* identity */;
            var link = new Link_Field(property.name, this, other_table, type);
            link.property = property;
            if (this.properties[link.name])
                link.field = this.properties[link.name];
            var other_link;
            if (!other_table.trellis) {
                var other_field_name = link.field && link.field.other_field ? link.field.other_field : property.parent.name;
                other_link = new Link_Field(property.name, other_table, this, 1 /* reference */);
                other_table.links[other_link.name] = other_link;
            }
            else {
                var other_field_name = link.field && link.field.other_field ? link.field.other_field : property.get_other_property(true).name;
                other_link = other_table.links[other_field_name] || null;
            }
            if (other_link) {
                link.other_link = other_link;
                other_link.other_link = link;
            }
            this.links[link.name] = link;
        };
        Table.prototype.create_sql = function (schema) {
            var fields = [];
            for (var name in this.properties) {
                var property = this.properties[name];
                var field = {
                    name: property.name || name,
                    type: schema.get_base_property_type(property.type).field_type,
                    default: undefined
                };
                if (property.default !== undefined)
                    field.default = property.default;
                fields.push(field);
            }
            return Table.create_sql_from_array(this.name, fields, this.primary_keys, this.indexes);
        };
        Table.create_sql_from_array = function (table_name, source, primary_keys, indexes) {
            if (primary_keys === void 0) { primary_keys = []; }
            if (indexes === void 0) { indexes = []; }
            var fields = MetaHub.map_to_array(source, function (field, index) {
                var name = field.name || index;
                var type = field.type;
                if (!type) {
                    console.error('source', table_name, source);
                    throw new Error('Field ' + name + ' is missing a type.');
                }
                var auto_increment = primary_keys.length < 2 && primary_keys[0] == name && type.search(/INT/) > -1;
                var field_sql = '`' + name + '` ' + type;
                if (auto_increment)
                    field_sql += ' AUTO_INCREMENT';
                if (field.allow_null === false) {
                    field_sql += ' NOT NULL';
                }
                if (!auto_increment && field.default !== undefined)
                    field_sql += ' DEFAULT ' + Table.format_value(field.default);
                return field_sql;
            });
            if (fields.length == 0) {
                if (source.length > 0)
                    throw new Error('None of the field arguments for creating ' + table_name + ' have a type.');
                else
                    throw new Error('Cannot creat a table without fields: ' + table_name + '.');
            }
            var primary_fields = MetaHub.map_to_array(primary_keys, function (key) { return '`' + key + '`'; });
            fields.push('PRIMARY KEY (' + primary_fields.join(', ') + ")\n");
            fields = fields.concat(indexes.map(function (index) { return Table.generate_index_sql(index); }));
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
            var indexes = this.indexes ? [].concat(this.indexes) : [];
            var core_properties = trellis.get_core_properties();
            if (Object.keys(core_properties).length === 0)
                throw new Error('Cannot create a table for ' + trellis.name + '. It does not have any core properties.');
            var fields = [];
            for (var name in core_properties) {
                var property = core_properties[name];
                var field_test = this.properties[property.name];
                if (property.is_virtual)
                    continue;
                if (field_test && field_test.share)
                    continue;
                var allow_null = property.get_allow_null();
                var default_value;
                if (allow_null) {
                    default_value = property.default !== undefined ? property.default : null;
                }
                else {
                    default_value = property.get_default();
                    if (default_value === null)
                        default_value = undefined;
                }
                var field = {
                    name: property.get_field_name(),
                    type: property.get_field_type(),
                    "default": default_value,
                    allow_null: allow_null
                };
                fields.push(field);
                if (property.is_unique) {
                    indexes.push({
                        name: name + '_unique_index',
                        fields: [name],
                        unique: true
                    });
                }
            }
            var primary_keys = this.get_primary_keys(trellis);
            return Table.create_sql_from_array(this.name, fields, primary_keys, indexes);
        };
        Table.prototype.get_primary_keys = function (trellis) {
            if (!this.primary_keys && trellis.parent) {
                var parent = trellis.parent;
                do {
                    if (parent.table && parent.table.primary_keys) {
                        return parent.table.primary_keys;
                    }
                } while (parent = parent.parent);
            }
            if (this.primary_keys && this.primary_keys.length > 0) {
                return this.primary_keys.map(function (name) {
                    if (!trellis.properties[name])
                        throw new Error('Error creating ' + trellis.name + '; it does not have a primary key named ' + name + '.');
                    return trellis.properties[name].get_field_name();
                });
            }
            var key = trellis.properties[trellis.primary_key];
            if (!key)
                throw new Error("Trellis " + trellis.name + " is missing primary key " + trellis.primary_key);
            return [key.get_field_name()];
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
        Table.generate_index_sql = function (index) {
            var name = index.name || '';
            var name_string, index_fields = index.fields.join('`, `');
            var result = '';
            if (index.is_unique) {
                result += 'UNIQUE ';
                name_string = '';
            }
            else {
                name_string = '`' + name + '`';
            }
            result += "KEY " + name_string + ' (`' + index_fields + "`)\n";
            return result;
        };
        Table.prototype.load_from_schema = function (source) {
            var name = this.name;
            MetaHub.extend(this, source);
            if (this.schema.trellises[name]) {
                this.trellis = this.schema.trellises[name];
                this.trellis.table = this;
                if (!source.name)
                    this.name = this.trellis.name + 's';
            }
        };
        return Table;
    })();
    Ground.Table = Table;
})(Ground || (Ground = {}));
var when = require('when');
var Ground;
(function (Ground) {
    var Schema = (function () {
        function Schema() {
            this.property_types = [];
            this.trellises = {};
            this.views = [];
            this.custom_tables = [];
            this.tables = [];
        }
        Schema.prototype.get_base_property_type = function (type) {
            var property_type = this.property_types[type];
            if (property_type.parent)
                return this.get_base_property_type(property_type.parent.name);
            return property_type;
        };
        Schema.prototype.convert_value = function (value, type) {
            if (value === undefined || value === null || value === false) {
                if (type == 'bool')
                    return false;
                return null;
            }
            var property_type = this.property_types[type];
            if (property_type && property_type.parent)
                return this.convert_value(value, property_type.parent.name);
            switch (type) {
                case 'date':
                case 'time':
                case 'datetime2':
                case 'guid':
                    return value;
                case 'list':
                case 'reference':
                    return value;
                case 'number':
                case 'int':
                    return Math.round(value);
                case 'string':
                case 'text':
                    return value;
                case 'boolean':
                case 'bool':
                    return Schema.to_bool(value);
                case 'float':
                case 'double':
                case 'money':
                    return parseFloat(value.toString());
                case 'json':
                    var bin = new Buffer(value, 'binary').toString();
                    var json = new Buffer(bin, 'base64').toString('ascii');
                    return JSON.parse(json);
            }
            throw new Error('Not sure how to convert sql type of ' + type + '.');
        };
        Schema.to_bool = function (input) {
            if (typeof input == 'string') {
                return input.toLowerCase() == 'true';
            }
            return !!input;
        };
        Schema.prototype.load_property_types = function (filename) {
            var property_types = Schema.load_json_from_file(filename);
            for (var name in property_types) {
                var info = property_types[name];
                var type = new Ground.Property_Type(name, info, this.property_types);
                this.property_types[name] = type;
            }
        };
        Schema.load_json_from_file = function (filename) {
            var fs = require('fs');
            var json = fs.readFileSync(filename, 'ascii');
            if (!json)
                throw new Error('Could not find file: ' + filename);
            return JSON.parse(json);
        };
        Schema.prototype.add_trellis = function (name, source, initialize_parent) {
            if (initialize_parent === void 0) { initialize_parent = true; }
            var trellis = this.trellises[name];
            if (trellis) {
                trellis = this.trellises[name];
                if (source)
                    trellis.load_from_object(source);
                return trellis;
            }
            trellis = new Ground.Trellis(name, this);
            if (source)
                trellis.load_from_object(source);
            this.trellises[name] = trellis;
            if (initialize_parent)
                this.initialize_trellises([trellis], this.trellises);
            return trellis;
        };
        Schema.prototype.get_trellis = function (trellis) {
            if (!trellis)
                throw new Error('Trellis argument is empty');
            if (typeof trellis === 'string') {
                if (!this.trellises[trellis])
                    throw new Error('Could not find trellis named: ' + trellis + '.');
                return this.trellises[trellis];
            }
            return trellis;
        };
        Schema.prototype.parse_schema = function (data, ground) {
            var subset = null;
            if (data.trellises)
                subset = this.load_trellises(data.trellises);
            if (data.views)
                this.views = this.views.concat(data.views);
            if (data.tables)
                ground.load_tables(data.tables);
            if (subset)
                this.initialize_trellises(subset, this.trellises);
        };
        Schema.prototype.initialize_trellises = function (subset, all) {
            if (all === void 0) { all = null; }
            all = all || subset;
            for (var i in subset) {
                var trellis = subset[i];
                trellis.initialize(all);
            }
        };
        Schema.prototype.load_trellises = function (trellises) {
            var subset = [];
            for (var name in trellises) {
                var trellis = this.add_trellis(name, trellises[name], false);
                subset[name] = trellis;
            }
            return subset;
        };
        Schema.prototype.harden_schema = function () {
            for (var i in this.trellises) {
                this.trellises[i].harden();
            }
        };
        return Schema;
    })();
    Ground.Schema = Schema;
})(Ground || (Ground = {}));
module.exports = Ground.Schema;
//# sourceMappingURL=schema.js.map