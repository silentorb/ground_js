/**
* User: Chris Johnson
* Date: 9/19/13
*/
var mysql = require("mysql");

var Ground_JS;
(function (Ground_JS) {
    var Database = (function () {
        function Database(settings, database) {
            this.settings = settings;
            this.database = database;
        }
        Database.prototype.query = function (sql, success) {
            var connection;
            connection = mysql.createConnection(this.settings[this.database]);
            connection.connect();
            connection.query(sql, function (err, rows, fields) {
                if (err)
                    throw err;

                if (typeof success === 'function')
                    return success(rows, fields);

                return null;
            });

            return connection.end();
        };
        return Database;
    })();
    Ground_JS.Database = Database;
})(Ground_JS || (Ground_JS = {}));
//# sourceMappingURL=Database.js.map
