/**
* User: Chris Johnson
* Date: 10/1/13
*/
/// <reference path="../references.ts"/>
var Ground;
(function (Ground) {
    var Link_Trellis = (function () {
        function Link_Trellis(trellises) {
            var _this = this;
            this.trellises = [];
            this.trellis_dictionary = {};
            this.trellises = trellises;

            for (var i = 0; i < trellises.length; ++i) {
                var trellis = trellises[i];
                this.trellis_dictionary[trellis.name] = trellis;
            }

            this.table_name = trellises.map(function (t) {
                return t.get_plural();
            }).sort().join('_');

            this.identities = trellises.map(function (x) {
                return _this.create_identity(x);
            });
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
            var trellises = [
                property.parent,
                property.other_trellis
            ];
            return new Link_Trellis(trellises);
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
            return 'JOIN ' + this.table_name + ' ON ' + this.get_condition_string(seeds) + "\n";
        };

        Link_Trellis.prototype.generate_delete_row = function (seeds) {
            //      var sql = "DELETE FROM %table_name WHERE %table_name.%first_key = " + first_id +
            //        " AND %table_name.%second_key = " + second_id + "\n;"
            //      return Link_Trellis2.populate_sql(sql, this.args);
            return 'DELETE ' + this.table_name + ' ON ' + this.get_condition_string(seeds) + "\n";
        };

        Link_Trellis.prototype.generate_insert = function (seeds) {
            var values = [], keys = [];
            console.log('seeds', seeds);

            for (var i in this.identities) {
                var identity = this.identities[i], seed = seeds[identity.trellis.name];
                for (var p in identity.keys) {
                    var key = identity.keys[p];
                    keys.push(key.name);
                    values.push(key.property.get_sql_value(seed[key.property.name]));
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
            var temp = MetaHub.map_to_array(this.identities, function (p) {
                return p.parent.get_plural();
            });
            temp = temp.sort();
            this.table_name = temp.join('_');
        };

        Link_Trellis.get_condition = function (key, seed) {
            if (seed[key.name] !== undefined) {
                var value = seed[key.name];
                if (typeof value === 'function')
                    value == value();
else
                    value = key.property.get_sql_value(value);

                return key.property.query() + ' = ' + value;
            } else
                return null;
        };

        Link_Trellis.prototype.get_condition_string = function (seeds) {
            return this.get_conditions(seeds).join(' AND ');
        };

        Link_Trellis.prototype.get_conditions = function (seeds) {
            var conditions = [];
            for (var i in this.identities) {
                var identity = this.identities[i], seed = seeds[identity.trellis.name];
                for (var p in identity.keys) {
                    var key = identity[p];
                    var condition = Link_Trellis.get_condition(key, seed);
                    if (condition)
                        conditions.push(condition);
                }
            }

            return conditions;
        };
        return Link_Trellis;
    })();
    Ground.Link_Trellis = Link_Trellis;
})(Ground || (Ground = {}));
//# sourceMappingURL=Link_Trellis.js.map
