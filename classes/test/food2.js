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
/// <reference path="Beverage.ts"/>
var Food;
(function (Food) {
    var Pizza = (function () {
        function Pizza() {
        }
        return Pizza;
    })();
    Food.Pizza = Pizza;
})(Food || (Food = {}));
