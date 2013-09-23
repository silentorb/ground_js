/**
* User: Chris Johnson
* Date: 9/19/13
*/
/// <reference path="../require.ts"/>
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
        Database.prototype.drop_all_tables = function () {
            var _this = this;
            return this.query('SET foreign_key_checks = 0').then(this.get_tables().map(function (table) {
                console.log('table', table);
                return _this.query('DROP TABLE IF EXISTS ' + table);
            })).then(this.query('SET foreign_key_checks = 1'));
        };

        Database.prototype.get_tables = function () {
            var def = new deferred();
            console.log('a');
            this.query('SHOW TABLES').then(function (tables) {
                return def.resolve(tables.map(function (row) {
                    console.log('test');
                    for (var i in row)
                        return row[i];

                    return null;
                }));
            });

            return def.promise;
        };

        Database.prototype.query = function (sql) {
            var connection, def = deferred();
            var mysql = require('mysql');
            connection = mysql.createConnection(this.settings[this.database]);
            connection.connect();
            connection.query(sql, function (err, rows, fields) {
                if (err)
                    throw err;

                console.log(sql, rows);
                def.resolve(rows, fields);

                return null;
            });

            return def.promise;
        };
        return Database;
    })();
    Ground.Database = Database;
})(Ground || (Ground = {}));
//# sourceMappingURL=Database.js.map
