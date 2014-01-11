/// <reference path="../references.ts"/>

module Ground {

export interface IPager {
    limit?
    offset?
  }

  export class Query_Builder {
    ground:Core
    trellis:Trellis
    pager:IPager
    type:string = 'query'
    properties
//    source:External_Query_Source
    sorts:Query_Sort[] = []

    filters:Query_Filter[] = []

    constructor(trellis:Trellis) {
      this.trellis = trellis
      this.ground = trellis.ground
    }

    add_filter(property_name:string, value = null, operator:string = '=') {
      var property = this.trellis.properties[property_name]
      if (!property)
        throw new Error('Trellis ' + this.trellis.name + ' does not contain a property named ' + property_name + '.')

      if (Query.operators.indexOf(operator) === -1)
        throw new Error("Invalid operator: '" + operator + "'.")

      if (value === null || value === undefined)
        throw new Error('Cannot add property filter where value is null; property = ' + this.trellis.name + '.' + property_name + '.')

      this.filters.push({
        property: property,
        value: value,
        operator: operator
      })
    }

    add_key_filter(value) {
      this.add_filter(this.trellis.primary_key, value)
    }

    add_sort(sort:Query_Sort) {
      for (var i = 0; i < this.sorts.length; ++i) {
        if (this.sorts[i].property == sort.property) {
          this.sorts.splice(i, 1)
          break
        }
      }

      this.sorts.push(sort)
    }

    run():Promise {
      var runner = new Query_Runner(this)
      return runner.run(this)
    }

    run_single():Promise {
      return this.run()
        .then((rows)=> rows[0])
    }
  }
}