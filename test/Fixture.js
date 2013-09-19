/**
* User: Chris Johnson
* Date: 9/19/13
*/
/// <reference path="../..//classes/Ground.ts"/>
/// <reference path="../../../../lib/Config.ts"/>
var Ground_Test;
(function (Ground_Test) {
    var Fixture = (function () {
        function Fixture(db_name, test) {
            if (typeof test === "undefined") { test = null; }
            var config = Config.load();
            this.ground = new Ground(db_name);
        }
        return Fixture;
    })();
    Ground_Test.Fixture = Fixture;
})(Ground_Test || (Ground_Test = {}));
//# sourceMappingURL=Fixture.js.map
