var when = require('when');

var Ground;
(function (Ground) {
    var Database = (function () {
        function Database(settings, database) {
            this.log_queries = false;
            this.settings = settings;
            this.database = database;
            var mysql = require('mysql');
            this.pool = mysql.createPool(this.settings[this.database]);
        }
        Database.prototype.add_table_to_database = function (table, ground) {
            var sql = table.create_sql(ground);
            return this.query(sql).then(function () {
                return table;
            });
        };

        Database.prototype.add_non_trellis_tables_to_database = function (tables, ground) {
            var _this = this;
            var non_trellises = MetaHub.filter(tables, function (x) {
                return !x.trellis;
            });

            var promises = MetaHub.map_to_array(non_trellises, function (table) {
                return _this.add_table_to_database(table, ground);
            });
            return when.all(promises);
        };

        Database.prototype.close = function () {
            this.pool.end();
        };

        Database.prototype.create_table = function (trellis) {
            if (!trellis)
                throw new Error('Empty object was passed to create_table().');

            var table = Table.create_from_trellis(trellis);
            var sql = table.create_sql_from_trellis(trellis);
            return this.query(sql).then(function () {
                return table;
            });
        };

        Database.prototype.create_trellis_tables = function (trellises) {
            var _this = this;
            var promises = MetaHub.map_to_array(trellises, function (trellis) {
                return _this.create_table(trellis);
            });
            return when.all(promises);
        };

        Database.prototype.drop_all_tables = function () {
            var _this = this;
            return when.map(this.get_tables(), function (table) {
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
            var def = when.defer();

            if (this.log_queries)
                console.log('start', sql);

            this.pool.query(sql, args, function (err, rows, fields) {
                if (err) {
                    console.log('error', sql);
                    throw err;
                }

                def.resolve(rows, fields);

                return null;
            });

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
