/**
* User: Chris Johnson
* Date: 10/3/13
*/
/// <reference path="../references.ts"/>
var Ground;
(function (Ground) {
    var Irrigation = (function () {
        function Irrigation(ground) {
            this.ground = ground;
        }
        Irrigation.prototype.query = function (request) {
            var trellis = this.ground.sanitize_trellis_argument(request.trellis);
            var query = new Ground.Query(trellis);

            return query.run();
        };

        Irrigation.prototype.update = function (request) {
            var promises = [];

            if (!request.objects)
                throw new Error('Request requires an objects array.');

            for (var i = 0; i < request.objects.length; ++i) {
                var object = request.objects[i];
                var promise = this.ground.update_object(object.trellis, object);
                promises.push(promise);
            }

            return when.all(promises);
        };
        return Irrigation;
    })();
    Ground.Irrigation = Irrigation;
})(Ground || (Ground = {}));
//# sourceMappingURL=Irrigation.js.map
