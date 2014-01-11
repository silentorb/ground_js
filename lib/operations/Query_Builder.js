/// <reference path="../references.ts"/>
var Ground;
(function (Ground) {
    var Query_Builder = (function () {
        function Query_Builder(trellis) {
            this.type = 'query';
            //    source:External_Query_Source
            this.sorts = [];
            this.filters = [];
            this.trellis = trellis;
            this.ground = trellis.ground;
        }
        Query_Builder.prototype.add_filter = function (property_name, value, operator) {
            if (typeof value === "undefined") { value = null; }
            if (typeof operator === "undefined") { operator = '='; }
            var property = this.trellis.properties[property_name];
            if (!property)
                throw new Error('Trellis ' + this.trellis.name + ' does not contain a property named ' + property_name + '.');

            if (Ground.Query.operators.indexOf(operator) === -1)
                throw new Error("Invalid operator: '" + operator + "'.");

            if (value === null || value === undefined)
                throw new Error('Cannot add property filter where value is null; property = ' + this.trellis.name + '.' + property_name + '.');

            this.filters.push({
                property: property,
                value: value,
                operator: operator
            });
        };

        Query_Builder.prototype.add_key_filter = function (value) {
            this.add_filter(this.trellis.primary_key, value);
        };

        Query_Builder.prototype.add_sort = function (sort) {
            for (var i = 0; i < this.sorts.length; ++i) {
                if (this.sorts[i].property == sort.property) {
                    this.sorts.splice(i, 1);
                    break;
                }
            }

            this.sorts.push(sort);
        };

        Query_Builder.prototype.run = function () {
            var runner = new Ground.Query_Runner(this);
            return runner.run(this);
        };

        Query_Builder.prototype.run_single = function () {
            return this.run().then(function (rows) {
                return rows[0];
            });
        };
        return Query_Builder;
    })();
    Ground.Query_Builder = Query_Builder;
})(Ground || (Ground = {}));
//# sourceMappingURL=Query_Builder.js.map
