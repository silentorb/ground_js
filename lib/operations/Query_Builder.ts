/// <reference path="../references.ts"/>

module Ground {

  export interface IPager {
    limit?
    offset?
  }

  export interface Query_Filter {
    property:Property
    value
    operator:string
  }

  export interface Query_Sort {
    property
    dir?
  }

  export class Query_Builder {
    ground:Core
    trellis:Trellis
    pager:IPager
    type:string = 'query'
    properties
//    source:External_Query_Source
    sorts:Query_Sort[] = []
    source:External_Query_Source
    include_links:boolean = false

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

    create_runner():Query_Runner {
      return new Query_Runner(this)
    }

    static create_join_filter(property:Property, seed):Query_Filter {
      var value = property.get_identity(seed)
      if (value === undefined || value === null)
        throw new Error()
      return {
        property: property.get_other_property(true),
        value: value,
        operator: '='
      }
    }

    extend(source:External_Query_Source) {
      var i
      this.source = source

      if (source.filters) {
        for (i = 0; i < source.filters.length; ++i) {
          var filter = source.filters[i]
          this.add_filter(filter.path || filter.property, filter.value, filter.operator)
        }
      }

      if (source.sorts) {
        for (i = 0; i < source.sorts.length; ++i) {
          this.add_sort(source.sorts[i])
        }
      }

      if (source.properties) {
        var properties = this.trellis.get_all_properties()
        this.properties = {}
        for (var i in source.properties) {
          var property = source.properties[i]
          if (typeof property == 'string') {
            if (!properties[property])
              throw new Error('Error with overriding query properties: ' + this.trellis.name + ' does not have a property named ' + property + '.')

            this.properties[property] = {
            }
          }
          else {
            if (!properties[property.name])
              throw new Error('Error with overriding query properties: ' + this.trellis.name + ' does not have a property named ' + property.name + '.')

            if (property)
              this.properties[property.name] = property
          }
        }

        var identities = [ this.trellis.properties[this.trellis.primary_key] ]
        if (identities[0].composite_properties && identities[0].composite_properties.length > 0) {
          identities = identities.concat(identities[0].composite_properties)
        }

        for (var k in identities) {
          var identity = identities[k]
          if (!this.properties[identity.name])
            this.properties[identity.name] = {}
        }
      }
    }

    run():Promise {
      var runner = new Query_Runner(this)
      return runner.run()
    }

    run_single():Promise {
      return this.run()
        .then((rows)=> rows[0])
    }
  }
}