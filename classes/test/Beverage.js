/// <reference path="Pizza.ts"/>
var Food;
(function (Food) {
    var Beverage = (function () {
        function Beverage() {
        }
        return Beverage;
    })();
    Food.Beverage = Beverage;
})(Food || (Food = {}));
//# sourceMappingURL=Beverage.js.map
