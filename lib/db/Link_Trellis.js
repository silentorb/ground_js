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
            var conditions = [];
            for (var i in this.properties) {
                var property = this.properties[i];
                var condition = Link_Trellis.get_condition(property, seed);
                if (condition)
                    conditions.push(condition);
            }

            return 'JOIN ' + this.table_name + ' ON ' + conditions.join(' AND ') + "\n";
        };

        Link_Trellis.prototype.generate_table_name = function () {
            var temp = MetaHub.map_to_array(this.properties, function (p) {
                return p.parent.get_plural();
            });
            temp = temp.sort();
            this.table_name = temp.join('_');
        };

        Link_Trellis.get_condition = function (property, seed) {
            if (seed[property.name] !== undefined)
                return property.query() + ' = ' + seed[property.name];
else
                return null;
        };
        return Link_Trellis;
    })();
    Ground.Link_Trellis = Link_Trellis;

    var Link_Trellis2 = (function () {
        function Link_Trellis2(property) {
            this.id_suffix = '';
            this.property = property;
            this.args = this.get_arguments(property);
        }
        Link_Trellis2.prototype.generate_join = function (id, reverse) {
            if (typeof reverse === "undefined") { reverse = false; }
            var sql;
            if (reverse) {
                sql = "JOIN %table_name ON %table_name.%second_key = %forward_id" + " AND %table_name.%first_key = " + id + "\n";
            } else {
                sql = "JOIN %table_name ON %table_name.%second_key = " + id + " AND %table_name.%first_key = %back_id\n";
            }

            return Link_Trellis.populate_sql(sql, this.args);
        };

        Link_Trellis2.prototype.generate_delete_row = function (first_id, second_id) {
            var sql = "DELETE FROM %table_name WHERE %table_name.%first_key = " + first_id + " AND %table_name.%second_key = " + second_id + "\n;";
            return Link_Trellis.populate_sql(sql, this.args);
        };

        Link_Trellis2.prototype.generate_insert = function (first_id, second_id) {
            var sql = "REPLACE INTO %table_name (`%first_key`, `%second_key`) VALUES (" + first_id + ", " + second_id + ")\n;";
            return Link_Trellis.populate_sql(sql, this.args);
        };

        Link_Trellis2.prototype.get_arguments = function (property) {
            var other_property = property.get_other_property();
            var first_key, second_key;

            // Since we are checking for an ideal cross table name,
            // Use plural trellis names isntead of any table name overrides.
            var other_table = other_property.parent.get_plural();
            var temp = [other_table, property.parent.get_plural()];
            temp = temp.sort();
            this.table_name = temp.join('_');
            var result = {
                '%first_id': property.query(),
                '%second_id': other_property.query(),
                '%back_id': other_property.parent.query_primary_key(),
                '%forward_id': property.parent.query_primary_key()
            };

            var ground = property.parent.ground;
            var table = ground.tables[this.table_name];
            if (table && Object.keys(table.properties).length >= 2) {
                for (var name in table.properties) {
                    var field = table.properties[name];
                    if (field.trellis === property.trellis)
                        first_key = name;
else if (field.trellis === other_property.other_trellis)
                        second_key = name;
                }

                console.log('info', first_key, second_key, table.name, result);
                if (!first_key || !second_key)
                    throw new Error('Properties do not line up for cross table: ' + this.table_name + '.');

                MetaHub.extend(result, {
                    '%table_name': table.name,
                    '%first_key': first_key,
                    '%second_key': second_key
                });
            } else {
                MetaHub.extend(result, {
                    '%table_name': this.table_name,
                    '%first_key': property.parent.name + this.id_suffix,
                    '%second_key': other_property.parent.name + this.id_suffix
                });
            }

            return result;
        };

        Link_Trellis2.populate_sql = function (sql, args) {
            var result = sql;
            for (var a in args) {
                result = result.replace(new RegExp(a, 'g'), args[a]);
            }
            return result;
        };
        return Link_Trellis2;
    })();
    Ground.Link_Trellis2 = Link_Trellis2;
})(Ground || (Ground = {}));
//# sourceMappingURL=Link_Trellis.js.map
