/**
* Created with JetBrains PhpStorm.
* User: Chris Johnson
* Date: 9/18/13
*/
/// <reference path="references.ts"/>
var Ground;
(function (Ground) {
    var Query = (function () {
        function Query(trellis, base_path) {
            if (typeof base_path === "undefined") { base_path = null; }
            this.trellises = [];
            this.joins = [];
            this.filters = [];
            this.post_clauses = [];
            this.sources = [];
            this.links = [];
            this.include_links = true;
            this.fields = [];
            this.arguments = [];
            this.expansions = [];
            this.trellis = trellis;
            this.ground = trellis.ground;
            this.expansions = this.ground.expansions;
            this.db = this.ground.db;
            this.main_table = trellis.get_table_name();
            if (base_path)
                this.base_path = base_path;
else
                this.base_path = this.trellis.name;
        }
        Query.log_queries = false;
        return Query;
    })();
})(Ground || (Ground = {}));
//# sourceMappingURL=Query.js.map
