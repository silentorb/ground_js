/**
* User: Chris Johnson
* Date: 9/19/13
*/
/// <reference path="../references.ts"/>
/// <reference path="../../defs/deferred.d.ts"/>
/// <reference path="../../defs/mysql.d.ts"/>
var deferred = require('deferred');

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
            return this.query(sql).then(function () {
                return table;
            });
        };

        Database.prototype.drop_all_tables = function () {
            var _this = this;
            return this.query('SET foreign_key_checks = 0').then(this.get_tables().map(function (table) {
                console.log('table', table);
                return _this.query('DROP TABLE IF EXISTS ' + table);
            })).then(function () {
                return _this.query('SET foreign_key_checks = 1');
            });
        };

        Database.prototype.get_tables = function () {
            return this.query('SHOW TABLES').map(function (row) {
                for (var i in row)
                    return row[i];

                return null;
            });
        };

        Database.prototype.query = function (sql) {
            var connection, def = deferred();
            var mysql = require('mysql');
            connection = mysql.createConnection(this.settings[this.database]);
            connection.connect();
            connection.query(sql, function (err, rows, fields) {
                if (err) {
                    console.log(sql);
                    throw err;
                }

                //        console.log(sql, rows)
                def.resolve(rows, fields);

                return null;
            });
            connection.end();

            return def.promise;
        };
        return Database;
    })();
    Ground.Database = Database;
})(Ground || (Ground = {}));
//# sourceMappingURL=Database.js.map
