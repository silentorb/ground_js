/**
* Created with JetBrains PhpStorm.
* User: Chris Johnson
* Date: 9/18/13
* Time: 5:40 PM
*/
/// <reference path="Trellis.ts"/>
var Ground_JS;
(function (Ground_JS) {
    var Property = (function () {
        function Property(name, source, trellis) {
            this.is_readonly = false;
            this.is_private = false;
            this.is_virtual = false;
            //      MetaHub.extend(this, source);
            this.name = name;
            this.parent = trellis;
        }
        return Property;
    })();
    Ground_JS.Property = Property;
})(Ground_JS || (Ground_JS = {}));
//# sourceMappingURL=Property.js.map
