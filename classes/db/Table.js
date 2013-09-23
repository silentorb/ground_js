/**
* User: Chris Johnson
* Date: 9/19/13
*/
/// <reference path="../references.ts"/>
/// <reference path="../../../metahub/metahub.ts"/>
var Ground;
(function (Ground) {
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
    Ground.Table = Table;
})(Ground || (Ground = {}));
//# sourceMappingURL=Table.js.map
