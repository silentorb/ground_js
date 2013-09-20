/**
* User: Chris Johnson
* Date: 9/19/13
*/
/// <reference path="../../../../defs/mysql.d.ts"/>
/// <reference path="../../../../defs/deferred.d.ts"/>
var mysql = require('mysql');
var deferred = require('deferred');

var Ground_JS;
(function (Ground_JS) {
    var Database = (function () {
        function Database(settings, database) {
            this.settings = settings;
            this.database = database;
        }
        Database.prototype.drop_all_tables = function () {
            var _this = this;
            return this.query('SET foreign_key_checks = 0').then(function () {
                return _this.get_tables().map(function (table) {
                    return _this.query('DROP TABLE IF EXISTS ' + table);
                });
            }).then(function () {
                _this.query('SET foreign_key_checks = 1');
            });
        };

        Database.prototype.get_tables = function () {
            return this.query('SHOW TABLES');
        };

        Database.prototype.query = function (sql) {
            var connection, def = deferred();
            connection = mysql.createConnection(this.settings[this.database]);
            connection.connect();
            connection.query(sql, function (err, rows, fields) {
                if (err)
                    throw err;

                def.resolve(rows, fields);

                return null;
            });

            return def.promise;
        };
        return Database;
    })();
    Ground_JS.Database = Database;
})(Ground_JS || (Ground_JS = {}));

