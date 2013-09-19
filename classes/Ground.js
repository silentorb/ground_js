/**
* Created with JetBrains PhpStorm.
* User: Chris Johnson
* Date: 9/18/13
*/
/// <reference path="../../metahub/metahub.ts"/>
/// <reference path="db/Database.ts"/>
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Ground_JS;
(function (Ground_JS) {
    var Property_Type = (function () {
        function Property_Type(name, info, types) {
            if (info.parent) {
                var parent = types[info.parent];

                //MetaHub.extend(this, parent);
                this.parent = parent;
            } else {
                this.field_type = info.field_type;
            }

            this.name = name;
            this.property_class = 'Property';
            if (info.default) {
                this.default_value = info.default;
            }
        }
        return Property_Type;
    })();

    var Ground = (function (_super) {
        __extends(Ground, _super);
        function Ground() {
            _super.apply(this, arguments);
        }
        return Ground;
    })(MetaHub.Meta_Object);
    Ground_JS.Ground = Ground;
})(Ground_JS || (Ground_JS = {}));
//# sourceMappingURL=Ground.js.map
