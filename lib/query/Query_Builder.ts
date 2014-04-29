/// <reference path="../references.ts"/>

module Ground {

  export interface IPager {
    limit?
    offset?
  }

  export interface Query_Filter {
    path?:string
    property?:Property
    value
    operator:string
  }

  export interface Query_Sort {
    property
    dir?
  }

//  export interface Filter_Operator {
//    symbol:string
//    action
//  }

  export interface Query_Transform {
    clause:string // A transitional hack.  This isn't something that could be used by a public service.
  }

  export class Query_Builder {
    ground:Core
    trellis:Trellis
    pager:IPager
    type:string = 'query'
    properties
    sorts:Query_Sort[] = []
    source:External_Query_Source
    include_links:boolean = false
    transforms:Query_Transform[] = []
    subqueries = {}
    map = {}
    queries:Query_Builder[] = undefined // used for Unions
    public static operators = {
      '=': null,
      'LIKE': {
        "render": (result, filter, property, data)=> {
          if (data.value !== null)
            data.value = "'%" + data.value + "%'"
        }
      },
      '!=': null
    }

    filters:Query_Filter[] = []

    constructor(trellis:Trellis) {
      this.trellis = trellis
      this.ground = trellis.ground
    }

    static add_operator(symbol:string, action) {
      Query_Builder.operators[symbol] = action
    }

    add_filter(path:string, value = null, operator:string = '=') {

//      if (!property)
//        throw new Error('Trellis ' + this.trellis.name + ' does not contain a property named ' + property_name + '.')
//      console.log('q', Query_Builder.operators)
      if (Query_Builder.operators[operator] === undefined)
        throw new Error("Invalid operator: '" + operator + "'.")

      if (value === null || value === undefined)
        throw new Error('Cannot add property filter where value is null; property = ' + this.trellis.name + '.' + path + '.')

      var filter = <Query_Filter>{
        path: path,
        value: value,
        operator: operator
      }

      if (path.indexOf('.') === -1) {
        var properties = this.trellis.get_all_properties()
        filter.property = properties[path]
      }

      this.filters.push(filter)
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

    add_map(target:string, source = null) {
      this.map[target] = source
    }


    add_query(source):Query_Builder {
      var trellis = this.ground.sanitize_trellis_argument(source.trellis)
      var query = new Query_Builder(trellis)
      this.queries = this.queries || []
      this.queries.push(query)
      query.extend(source)

      return query
    }

    add_subquery(property_name:string, source = null):Query_Builder {
      var properties = this.trellis.get_all_properties()
      var property = properties[property_name]
      if (!property)
        throw new Error('Cannot create subquery. '
          + this.trellis.name + ' does not have a property named ' + property_name + '.')

      if (!property.other_trellis)
        throw new Error('Cannot create a subquery from ' + property.fullname() + ' it does not reference another trellis.')

      var query = this.subqueries[property_name]
      if (!query) {
        query = new Query_Builder(property.other_trellis)
        query.include_links = false
        this.subqueries[property_name] = query
      }

      query.extend(source)
      return query
    }

    add_transform_clause(clause:string) {
      this.transforms.push({
        clause: clause
      })
    }

    create_runner():Query_Runner {
      return new Query_Runner(this)
    }

    static create_join_filter(property:Property, seed):Query_Filter {
      var value = property.parent.get_identity(seed)
      if (value === undefined || value === null)
        throw new Error(property.fullname() + ' could not get a valid identity from the provided seed.')

      var other_property = property.get_other_property(true)
      return {
        path: other_property.name,
        property: other_property,
        value: value,
        operator: '='
      }
    }

    extend(source:External_Query_Source) {
      if (!source) // I think it's okay to allow null to be passed to this method
        return

      if (typeof source.type === 'string')
        this.type = source.type

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

      if (source.pager) {
        this.pager = source.pager
      }

      if (source.type === 'union') {
        for (i = 0; i < source.queries.length; ++i) {
          this.add_query(source.queries[i])
        }
      }
      else {
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
              var name = property.name || i
              if (!properties[name])
                throw new Error('Error with overriding query properties: ' + this.trellis.name + ' does not have a property named ' + name + '.')

              if (property)
                this.properties[name] = property
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

      if (typeof source.subqueries == 'object') {
        for (i in source.subqueries) {
          this.add_subquery(i, source.subqueries[i])
        }
      }

      if (typeof source.map == 'object') {
        for (i in source.map) {
          this.add_map(i, source.map[i])
        }
      }

      if (MetaHub.is_array(source.expansions)) {
        for (i = 0; i < source.expansions.length; ++i) {
          var expansion = source.expansions[i]
          var tokens = expansion.split('/')
          var subquery = this
          for (var j = 0; j < tokens.length; ++j) {
            subquery = subquery.add_subquery(tokens[j], {})
          }
        }
      }
    }

    get_primary_key_value() {
      var filters = this.filters.filter((filter)=>filter.path == this.trellis.primary_key)
      if (filters.length > 0)
        return filters[0].value

      return undefined
    }

    run():Promise {
      var runner = new Query_Runner(this)
//      console.log('filters', this.filters)
      return runner.run()
    }

    run_single():Promise {
      return this.run()
        .then((result)=> result.objects[0])
    }
  }
}