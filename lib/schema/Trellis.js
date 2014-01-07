/**
* Created with JetBrains PhpStorm.
* User: Chris Johnson
* Date: 9/18/13
*/
/// <reference path="../references.ts"/>
var Ground;
(function (Ground) {
    var Trellis = (function () {
        function Trellis(name, ground) {
            this.plural = null;
            this.parent = null;
            this.table = null;
            this.name = null;
            this.primary_key = 'id';
            // Property that are specific to this trellis and not inherited from a parent trellis
            this.properties = {};
            // Every property including inherited properties
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
            //      return Enumerable.From(this.properties).Where(
            //        (p) => p.type != 'list'
            //      );
        };

        Trellis.prototype.get_id = function (source) {
            if (source && typeof source === 'object')
                return source[this.primary_key];

            return source;
        };

        Trellis.prototype.get_ancestor_join = function (other) {
            //      if (!this.parent)
            //        return null;
            var conditions = this.get_primary_keys().map(function (property) {
                return property.query() + ' = ' + other.properties[property.name].query();
            });

            return 'JOIN  ' + other.get_table_query() + ' ON ' + conditions.join(' AND ');
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
            if (this.parent && this.ground.tables[this.parent.name])
                return this.parent.get_root_table();

            return this.ground.tables[this.name];
        };

        Trellis.prototype.get_table_name = function () {
            //      console.log('get_table_name', this.name, this.is_virtual, this.plural, this.table)
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

            return '`' + this.get_table_name() + '`';
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
            return this.get_table_query() + '.' + this.properties[this.primary_key].get_field_name();
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

            //      console.log(this.name, parent.name)
            if (parent.table && parent.table.primary_keys) {
                keys = parent.table.primary_keys;
                if (!this.table)
                    this.table = Ground.Table.create_from_trellis(this);

                this.table.primary_keys = keys;
                //        console.log('table', this.table)
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
//# sourceMappingURL=Trellis.js.map
