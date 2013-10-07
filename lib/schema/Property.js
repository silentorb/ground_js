/**
* Created with JetBrains PhpStorm.
* User: Chris Johnson
* Date: 9/18/13
* Time: 5:40 PM
*/
/// <reference path="../references.ts"/>
/// <reference path="../../defs/when.d.ts"/>
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
            this.default = null;
            this.other_trellis = null;
            this.other_trellis_name = null;
            this.is_private = false;
            this.is_virtual = false;
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
            var property_type = this.get_property_type();
            if (!property_type)
                throw new Error(this.name + ' could not find valid field type: ' + this.type);

            return property_type.get_field_type();
        };

        Property.get_field_value_sync = function (value) {
            if (typeof value === 'string') {
                value = value.replace(/'/g, "\\'", value);
                value = "'" + value.replace(/[\r\n]+/, "\n") + "'";
                //        console.log('value', value)
            } else if (value === true)
                value = 'TRUE';
else if (value === false)
                value = 'FALSE';
            if (value === null || value === undefined)
                value = 'NULL';

            return value;
        };

        Property.prototype.get_field_value = function (value, as_service) {
            if (typeof as_service === "undefined") { as_service = false; }
            var _this = this;
            if (typeof value === 'string')
                value = value.replace(/'/g, "\\'", value);

            if (value === true)
                value = 'TRUE';
else if (value === false)
                value = 'FALSE';
            if (value === null || value === undefined)
                value = 'NULL';
else if (this.type == 'string' || this.type == 'text') {
                value = "'" + value.replace(/[\r\n]+/, "\n") + "'";
            } else if (this.type == 'reference' && typeof value === 'object') {
                //        console.log(value.other_trellis, this.other_trellis.name)
                var trellis = this.other_trellis;
                var ground = this.parent.ground;

                return ground.update_object(trellis, value, as_service).then(function (entity) {
                    var other_id = _this.get_other_id(value);
                    if (other_id !== null)
                        value = other_id;
else
                        value = entity[trellis.primary_key];

                    if (value === null || value === undefined)
                        value = 'NULL';

                    return value;
                });
            }

            return when.resolve(value);
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

            // If there is no existing connection defined in this trellis, create a dummy
            // connection and assume that it is a list.  This means that implicit connections
            // are either one-to-many or many-to-many, never one-to-one.
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
//# sourceMappingURL=Property.js.map