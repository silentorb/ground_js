/**
* User: Chris Johnson
* Date: 9/19/13
*/
/// <reference path="../references.ts"/>
/// <reference path="../../defs/mysql.d.ts"/>
/// <reference path="../../defs/when.d.ts"/>
var when = require('when');

var Ground;
(function (Ground) {
    var Database = (function () {
        function Database(settings, database) {
            this.settings = settings;
            this.database = database;
        }
        Database.prototype.create_table = function (trellis) {
            if (!trellis)
                throw new Error('Empty object was passed to create_table().');

            var table = Ground.Table.create_from_trellis(trellis);
            var sql = table.create_sql_from_trellis(trellis);

            //      console.log('sql', sql)
            return this.query(sql).then(function () {
                return table;
            });
        };

        Database.prototype.create_tables = function (trellises) {
            var _this = this;
            //      console.log(Object.keys(trellises));
            var promises = MetaHub.map_to_array(trellises, function (trellis) {
                return _this.create_table(trellis);
            });
            return when.all(promises);
        };

        Database.prototype.drop_all_tables = function () {
            var _this = this;
            //      return this.query('SET foreign_key_checks = 0')
            //        .then(when.map(this.get_tables(),(table) => {
            //            console.log('table', table);
            //            return this.query('DROP TABLE IF EXISTS ' + table);
            //          }))
            //        .then(()=> this.query('SET foreign_key_checks = 1'));
            return when.map(this.get_tables(), function (table) {
                //        console.log('table', table);
                return _this.query('DROP TABLE IF EXISTS `' + table + '`');
            });
        };

        Database.prototype.get_tables = function () {
            return when.map(this.query('SHOW TABLES'), function (row) {
                for (var i in row)
                    return row[i];

                return null;
            });
        };

        Database.prototype.query = function (sql, args) {
            if (typeof args === "undefined") { args = undefined; }
            var connection, def = when.defer();
            var mysql = require('mysql');
            connection = mysql.createConnection(this.settings[this.database]);
            connection.connect();

            //      console.log('start', sql)
            connection.query(sql, args, function (err, rows, fields) {
                if (err) {
                    console.log('error', sql);
                    throw err;
                }

                //        console.log('sql', sql)
                def.resolve(rows, fields);

                return null;
            });
            connection.end();

            return def.promise;
        };

        Database.prototype.query_single = function (sql, args) {
            if (typeof args === "undefined") { args = undefined; }
            return this.query(sql, args).then(function (rows) {
                return rows[0];
            });
        };
        return Database;
    })();
    Ground.Database = Database;
})(Ground || (Ground = {}));
//# sourceMappingURL=Database.js.map
