/**
* User: Chris Johnson
* Date: 9/19/13
*/
/// <reference path="../references.ts"/>
var Ground_JS;
(function (Ground_JS) {
    var Table = (function () {
        function Table(name, ground) {
            this.properties = [];
            this.name = name;
            this.ground = ground;
        }
        Table.prototype.load_from_schema = function (source) {
            MetaHub.extend(this, source);
            if (this.ground.trellises[this.name]) {
                this.trellis = this.ground.trellises[this.name];
                this.trellis.table = this;
            }
        };
        return Table;
    })();
    Ground_JS.Table = Table;
})(Ground_JS || (Ground_JS = {}));
//# sourceMappingURL=Table.js.map
