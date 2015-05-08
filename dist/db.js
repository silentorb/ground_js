/// <reference path="../../defs/mysql.d.ts"/>
/// <reference path="../../../vineyard-metahub/metahub.d.ts"/>
/// <reference path="../../dist/landscape.d.ts"/>
/// <reference path="../../dist/mining.d.ts"/>
var when = require('when');
var mysql = require('mysql');
var sequence = require('when/sequence');
var landscape = require('./landscape')
var mining = require('./mining')
var MetaHub = require('vineyard-metahub')
var Database = (function () {
    function Database(settings, database) {
        this.log_queries = false;
        this.script_pool = null;
        this.active = false;
        this.active_query_count = 0;
        this.on_final_query = null;
        this.settings = settings;
        this.database = database;
        this.start();
    }
    Database.prototype.add_table_to_database = function (table, schema) {
        var sql = table.create_sql(schema);
        return this.query(sql).then(function () { return table; });
    };
    Database.prototype.add_non_trellis_tables_to_database = function (tables, schema) {
        var _this = this;
        var non_trellises = MetaHub.filter(tables, function (x) { return !x.trellis; });
        var promises = MetaHub.map_to_array(non_trellises, function (table) { return _this.add_table_to_database(table, schema); });
        return when.all(promises);
    };
    Database.prototype.start = function () {
        if (this.active)
            return;
        this.pool = mysql.createPool(this.settings[this.database]);
        this.active = true;
        console.log('DB connection pool created.');
    };
    Database.prototype.close = function (immediate) {
        var _this = this;
        if (immediate === void 0) { immediate = false; }
        var actions = [];
        if (!immediate)
            actions.push(function () { return _this.wait_for_remaining_queries(); });
        return sequence(actions.concat([
            function () { return _this.close_all_pools(); },
            function () {
                _this.active = false;
                console.log('Ground DB successfully shut down.');
            }
        ]));
    };
    // This function is used to avoid closing the db while connections are still being fired during tests.
    // Eventually this may need to also hook into new db queries and have a some timing
    // mechanism to see if no queries are fired after active_query_count hits zero.
    // That case might be possible with promise chains.
    Database.prototype.wait_for_remaining_queries = function () {
        var _this = this;
        if (this.active_query_count == 0)
            return when.resolve();
        var def = when.defer();
        // Eventually this may be supported, but for now I don't know what would
        // cause this and if it does happen I want it analyzed before allowed.
        if (this.on_final_query)
            throw new Error("wait_for_remaining_queries was called twice.");
        this.on_final_query = function () {
            _this.on_final_query = null;
            def.resolve();
        };
        return def.promise;
    };
    Database.prototype.close_all_pools = function () {
        var promises = [];
        if (this.pool) {
            promises.push(this.close_pool(this.pool, 'main'));
            this.pool = null;
        }
        if (this.script_pool) {
            promises.push(this.close_pool(this.script_pool, 'script'));
            this.script_pool = null;
        }
        return when.all(promises);
    };
    Database.prototype.close_pool = function (pool, name) {
        var def = when.defer();
        pool.end(function (error) {
            if (error) {
                console.error('Error closing ' + name + ' pool:', error);
                def.reject(error);
            }
            def.resolve();
        });
        return def.promise;
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
    Database.prototype.is_active = function () {
        return this.active;
    };
    Database.prototype.query = function (sql, args, pool) {
        var _this = this;
        if (args === void 0) { args = undefined; }
        if (pool === void 0) { pool = undefined; }
        if (!pool)
            pool = this.pool;
        var def = when.defer();
        if (this.log_queries)
            console.log('start', sql);
        this.pool.query(sql, args, function (err, rows, fields) {
            _this.active_query_count--;
            if (_this.on_final_query) {
                console.log('remaining-queries:', _this.active_query_count);
                if (_this.active_query_count == 0)
                    _this.on_final_query();
            }
            if (err) {
                console.error('error', sql);
                def.reject(err);
            }
            //        console.log('sql', sql)
            def.resolve(rows, fields);
            return null;
        });
        this.active_query_count++;
        return def.promise;
    };
    Database.prototype.query_single = function (sql, args) {
        if (args === void 0) { args = undefined; }
        return this.query(sql, args).then(function (rows) { return rows[0]; });
    };
    // Identical to query(), except that it uses a connection that allows
    // multiple SQL statements in one call.  (By default that is disabled in the main connection pool.)
    Database.prototype.run_script = function (sql, args) {
        if (args === void 0) { args = undefined; }
        if (!this.script_pool) {
            var settings = MetaHub.extend({}, this.settings[this.database]);
            settings.multipleStatements = true;
            this.script_pool = mysql.createPool(settings);
        }
        return this.query(sql, args, this.script_pool);
    };
    return Database;
})();
module.exports = Database;
//# sourceMappingURL=db.js.map