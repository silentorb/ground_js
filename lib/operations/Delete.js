/**
* User: Chris Johnson
* Date: 9/25/13
*/
/// <reference path="../references.ts"/>
var Ground;
(function (Ground) {
    var Delete = (function () {
        function Delete(trellis, seed) {
            this.trellis = trellis;
            this.seed = seed;
        }
        Delete.prototype.get_access_name = function () {
            return this.trellis + '.delete';
        };

        Delete.prototype.run = function () {
            throw new Error('Not implemented yet.');
        };
        return Delete;
    })();
    Ground.Delete = Delete;
})(Ground || (Ground = {}));
//# sourceMappingURL=Delete.js.map
