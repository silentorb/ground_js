/**
* User: Chris Johnson
* Date: 10/1/13
*/
/// <reference path="../references.ts"/>
var Ground;
(function (Ground) {
    var Link_Trellis = (function () {
        function Link_Trellis(property) {
            this.properties = {};
            this.initialize_property(property);
            this.initialize_property(property.get_other_property());
        }
        Link_Trellis.prototype.initialize_property = function (property) {
            this.properties[property.name] = property;
            if (property.composite_properties) {
                for (var i in property.composite_properties) {
                    var prop = property.composite_properties[i];
                    this.properties[prop.name] = prop;
                }
            }
        };

        Link_Trellis.prototype.generate_join = function (seed) {
            //      var sql = "JOIN %table_name ON %table_name.%second_key = " + id +
            //        " AND %table_name.%first_key = %back_id\n";
            return 'JOIN ' + this.table_name + ' ON ' + this.get_condition_string(seed) + "\n";
        };

        Link_Trellis.prototype.generate_delete_row = function (seed) {
            //      var sql = "DELETE FROM %table_name WHERE %table_name.%first_key = " + first_id +
            //        " AND %table_name.%second_key = " + second_id + "\n;"
            //      return Link_Trellis2.populate_sql(sql, this.args);
            return 'DELETE ' + this.table_name + ' ON ' + this.get_condition_string(seed) + "\n";
            throw new Error('not implemented');
        };

        Link_Trellis.prototype.generate_insert = function (first_id, second_id) {
            var fields = this.get_key_values();

            throw new Error('not implemented');
            //      var sql = "REPLACE INTO %table_name (`%first_key`, `%second_key`) VALUES ("
            //        + first_id + ", " + second_id + ")\n;"
            //      return Link_Trellis2.populate_sql(sql, this.args);
        };

        Link_Trellis.prototype.generate_table_name = function () {
            var temp = MetaHub.map_to_array(this.properties, function (p) {
                return p.parent.get_plural();
            });
            temp = temp.sort();
            this.table_name = temp.join('_');
        };

        Link_Trellis.get_condition = function (property, seed) {
            if (seed[property.name] !== undefined) {
                var value = seed[property.name];
                if (typeof value === 'function')
                    value == value();
else
                    value = property.get_sql_value(value);
                return property.query() + ' = ' + value;
            } else
                return null;
        };

        Link_Trellis.prototype.get_condition_string = function (seed) {
            return this.get_conditions(seed).join(' AND ');
        };

        //    get_key_values():any {
        //      var result = {}
        //
        //      for (var p in this.properties) {
        //        var property = this.properties[p]
        //        var trellis = property.other_trellis
        //        var primary = trellis.properties[trellis.primary_key]
        //        result[trellis.primary_key] = primary
        //        if (primary.composite_properties) {
        //          for (var c in primary.composite_properties) {
        //            result[c] = primary.composite_properties[c]
        //          }
        //        }
        //      }
        //
        //      return result
        //    }
        Link_Trellis.prototype.get_conditions = function (seed) {
            var conditions = [];
            for (var i in this.properties) {
                var property = this.properties[i];
                var condition = Link_Trellis.get_condition(property, seed);
                if (condition)
                    conditions.push(condition);
            }

            return conditions;
        };
        return Link_Trellis;
    })();
    Ground.Link_Trellis = Link_Trellis;
})(Ground || (Ground = {}));
//# sourceMappingURL=Link_Trellis.js.map
