/// <reference path="../references.ts"/>

module Ground {

  export interface Query_Result {
    query_count:number
    return_sql?:boolean
    user
  }

  export interface IPager {
    limit?
    offset?
  }

  export interface Query_Filter_Source {
    property?:string
    path?:string
    value
    operator?:string
    type?:string
    filters?:Query_Filter_Source[]
  }

  export interface Query_Filter {
    path?:string
    property?:landscape.Property
    value?
    operator?:string
    type?:string
    filters?:Query_Filter[]
  }

  export interface Condition_Source {
    path?:string
    value?
    operator?:string

    type?:string
    filters?:Condition_Source[]
  }

  export interface Condition {
    path?:landscape.Property[]
    value?
    operator?:string

    type?:string
    filters?:Condition[]
  }

  export interface Query_Sort {
    property?
    path?
    dir?
  }

  function generate_operator_map() {
    var like = {
      "render": (result, filter, property, data)=> {
        if (data.value !== null)
          data.value = "'%" + data.value + "%'"
      }
    }

    var in_operator = {
      "render": (result, filter, property:landscape.Property, data)=> {
        var values = data.value.map((v)=> property.get_sql_value(v))
        data.value = "(" + values.join(', ') + ")"
      },
      "validate": (value, path, query)=> {
        return MetaHub.is_array(value)
      }
    }

    return {
      '=': null,
      'like': like,
      'LIKE': like,
      '!=': null,
      '<': null,
      '>': null,
      '<=': null,
      '>=': null,
      '=>': null,
      '=<': null,
      'in': in_operator,
      'IN': in_operator
    }
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
    trellis:landscape.Trellis
    pager:IPager
    type:string = 'query'
    properties
    condition:Condition
    sorts:Query_Sort[] = []
    source:External_Query_Source
    include_links:boolean = false
    transforms:Query_Transform[] = []
    subqueries = {}
    map = {}
    queries:Query_Builder[] = undefined // used for Unions
    optimized_union:boolean = false
    public static operators = generate_operator_map()

    filters:Query_Filter[] = []

    constructor(trellis:landscape.Trellis) {
      this.trellis = trellis
      this.ground = trellis.ground
    }


    public static create(ground:Core, source = null):Query_Builder {
      var trellis = ground.sanitize_trellis_argument(source.trellis)
      var result = new Query_Builder(trellis)
      result.extend(source)
      return result
    }

    static add_operator(symbol:string, action) {
      Query_Builder.operators[symbol] = action
    }

    add_filter(path:string, value = null, operator:string = '=') {
      var operator_entry = Query_Builder.operators[operator]
      if (operator_entry === undefined)
        throw new Error("Invalid operator: '" + operator + "'.")

      if (operator_entry && typeof operator_entry.validate === 'function') {
        if (!operator_entry.validate(value, path, this))
          throw new Error('Invalid value for filtering ' + path + ' using operator "' + operator + '".')
      }
      else if (value === undefined) {
        throw new Error('Cannot add property filter where value is undefined; property = ' + this.trellis.name + '.' + path + '.')
      }

      var filter = <Query_Filter>{
        path: path,
        value: value,
        operator: operator
      }

      if (path.indexOf('.') === -1) {
        var properties = this.trellis.get_all_properties()
        filter.property = properties[path]
        if (!filter.property) {
          throw new Ground.InputError('Invalid filter path.  landscape.Trellis ' + this.trellis.name
          + ' does not have a property named "' + path + '.')
        }
      }

      this.filters.push(filter)
    }

    create_filter(source:Query_Filter_Source):Query_Filter {
      if (source.type == "or" || source.type == "and") {
        return {
          type: source.type,
          filters: source.filters.map((x) => this.create_filter(x))
        }
      }
      else {
        var operator = source.operator || '='
        if (Query_Builder.operators[operator] === undefined)
          throw new Error("Invalid operator: '" + operator + "'.")

        if (source.value === undefined) {
          throw new Error('Cannot add property filter where value is undefined; property = '
          + this.trellis.name + '.' + source.path + '.')
        }

        var filter = {
          path: source.path, // Query_Renderer.get_chain(source.path, this.trellis),
          value: source.value,
          operator: operator
        }

        return filter
      }
    }

    add_key_filter(value) {
      this.add_filter(this.trellis.primary_key, value)
    }

    add_sort(sort:Query_Sort) {
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

    static create_join_filter(property:landscape.Property, seed):Query_Filter {
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

    extend(source) {
      if (!source) // I think it's okay to allow null to be passed to this method
        return

      if (typeof source.type === 'string')
        this.type = source.type

      var i
      this.source = source

      if (source.filters) {
        for (i = 0; i < source.filters.length; ++i) {
          var filter = source.filters[i]
          //this.add_filter(filter.path || filter.property, filter.value, filter.operator)
          this.filters.push(this.create_filter(filter))
        }
      }

      //if (source.condition) {
      //  this.condition = this.create_condition(source.condition)
      //}

      if (source.sorts) {
        for (i = 0; i < source.sorts.length; ++i) {
          this.add_sort(source.sorts[i])
        }
      }

      if (source.pager) {
        this.pager = source.pager
      }
      if (source.range) {
        this.pager = {
          offset: source.range.start,
          limit: source.range.length
        }
      }

      if (source.type === 'union') {
        for (i = 0; i < source.queries.length; ++i) {
          this.add_query(source.queries[i])
        }
      }
      else if (source.properties) {
        this.add_properties(source.properties)
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
        this.add_expansions(source.expansions)
      }
    }

    add_properties(source_properties) {
      var properties = this.trellis.get_all_properties()
      this.properties = this.properties || {}
      for (var i in source_properties) {
        var property = source_properties[i]
        if (typeof property == 'string') {
          if (!properties[property])
            throw new Error('Error with overriding query properties: ' + this.trellis.name + ' does not have a property named ' + property + '.')

          this.properties[property] = {}
        }
        else {
          var name = property.name || i
          if (!properties[name])
            throw new Error('Error with overriding query properties: ' + this.trellis.name + ' does not have a property named ' + name + '.')

          if (property)
            this.properties[name] = property
        }
      }

      var identities = [this.trellis.properties[this.trellis.primary_key]]
      if (identities[0].composite_properties && identities[0].composite_properties.length > 0) {
        identities = identities.concat(identities[0].composite_properties)
      }

      for (var k in identities) {
        var identity = identities[k]
        if (!this.properties[identity.name])
          this.properties[identity.name] = {}
      }
    }

    add_expansions(expansions) {
      for (var i = 0; i < expansions.length; ++i) {
        var expansion = expansions[i]
        var tokens = expansion.split(/[\/\.]/g)
        var subquery = this
        for (var j = 0; j < tokens.length; ++j) {
          subquery = subquery.add_subquery(tokens[j], {})
        }
      }
    }

    get_primary_key_value() {
      var filters = this.filters.filter((filter)=>filter.path == this.trellis.primary_key)
      if (filters.length > 0)
        return filters[0].value

      return undefined
    }

    get_properties() {
      if (this.properties && Object.keys(this.properties).length > 0) {
        var properties = this.trellis.get_all_properties()
        return MetaHub.map(this.properties, (property, key)=> properties[key])
      }
      else {
        return this.trellis.get_all_properties()
      }
    }

    get_field_properties() {
      var result = {}
      var properties = this.get_properties()
      for (var i in properties) {
        var property = properties[i]
        if (property.type == 'list')
          continue

        if (property.is_virtual) {
          var field = property.get_field_override()
          if (!field || typeof field.sql != 'string')
            continue
        }

        result[property.name] = property
      }

      return result
    }

    get_field_properties2():landscape.Property[] {
      var result = []
      var properties = this.get_properties()
      for (var i in properties) {
        var property = properties[i]
        if (property.type == 'list')
          continue

        if (property.is_virtual) {
          var field = property.get_field_override()
          if (!field || typeof field.sql != 'string')
            continue
        }

        result.push(property)
      }

      return result
    }

    run(user, query_result:Query_Result = null):Promise {
      if (!query_result)
        query_result = {query_count: 0, user: user}
//console.log('query-count', this.trellis.name, query_result.query_count)
      ++query_result.query_count
      var runner = new Query_Runner(this)
//      console.log('filters', this.filters)
      return runner.run(query_result)
    }

    run_single(user, query_result:Query_Result = null):Promise {
      return this.run(user, query_result)
        .then((result)=> result.objects[0])
    }
  }
}