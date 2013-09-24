/**
* Created with JetBrains PhpStorm.
* User: Chris Johnson
* Date: 9/18/13
* Time: 5:40 PM
*/
/// <reference path="references.ts"/>
var Ground;
(function (Ground) {
    var Property = (function () {
        function Property(name, source, trellis) {
            this.is_readonly = false;
            this.is_private = false;
            this.is_virtual = false;
            MetaHub.extend(this, source);

            this.name = name;
            this.parent = trellis;
        }
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
            if (property_type)
                return property_type.get_field_type();
            console.log('types:', Object.keys(this.parent.ground.property_types));
            throw new Error(this.name + ' could not find valid field type: ' + this.type);
        };

        Property.prototype.get_property_type = function () {
            var types = this.parent.ground.property_types;
            if (types[this.type] !== undefined)
                return types[this.type];

            return null;
        };
        return Property;
    })();
    Ground.Property = Property;
})(Ground || (Ground = {}));
//# sourceMappingURL=Property.js.map
