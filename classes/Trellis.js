/**
* Created with JetBrains PhpStorm.
* User: Chris Johnson
* Date: 9/18/13
*/
/// <reference path="Ground.ts"/>
/// <reference path="Property.ts"/>
/// <reference path="db/Table.ts"/>
var Ground_JS;
(function (Ground_JS) {
    var Trellis = (function () {
        function Trellis(name, ground) {
            this.primary_key = 'id';
            // Property that are specific to this trellis and not inherited from a parent trellis
            this.properties = new Array();
            // Every property including inherited properties
            this.all_properties = new Array();
            this.is_virtual = false;
            this.ground = ground;
            this.name = name;
        }
        Trellis.prototype.add_property = function (name, source) {
            var property = new Ground_JS.Property(name, source, this);
            this.properties[name] = property;
            this.all_properties[name] = property;
            return property;
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

            return this.name + '';
        };
        return Trellis;
    })();
    Ground_JS.Trellis = Trellis;
})(Ground_JS || (Ground_JS = {}));
//# sourceMappingURL=Trellis.js.map
