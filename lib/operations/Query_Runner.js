/// <reference path="../references.ts"/>
var Ground;
(function (Ground) {
    var Query_Runner = (function () {
        function Query_Runner(source) {
            this.source = source;
            this.ground = source.ground;
            this.renderer = new Ground.Query_Renderer();
        }
        Query_Runner.prototype.run_core = function (source) {
            var _this = this;
            if (this.row_cache)
                return when.resolve(this.row_cache);

            var tree = source.trellis.get_tree();
            var promises = tree.map(function (trellis) {
                return _this.ground.invoke(trellis.name + '.query', source);
            });

            return when.all(promises).then(function () {
                var sql = _this.renderer.generate_sql(source);
                sql = sql.replace(/\r/g, "\n");
                if (_this.ground.log_queries)
                    console.log('query', sql);

                //          var args = MetaHub.values(this.arguments).concat(args);
                return _this.ground.db.query(sql).then(function (rows) {
                    _this.row_cache = rows;
                    return rows;
                });
            });
        };

        Query_Runner.prototype.run = function (source) {
            var _this = this;
            if (this.ground.log_queries) {
                var temp = new Error();
                this.run_stack = temp['stack'];
            }

            var properties = source.trellis.get_all_properties();
            return this.run_core(source).then(function (rows) {
                return when.all(rows.map(function (row) {
                    return _this.process_row(row);
                }));
            });
        };

        Query_Runner.prototype.run_single = function (source) {
            return this.run(source).then(function (rows) {
                return rows[0];
            });
        };
        return Query_Runner;
    })();
    Ground.Query_Runner = Query_Runner;
})(Ground || (Ground = {}));
//# sourceMappingURL=Query_Runner.js.map
