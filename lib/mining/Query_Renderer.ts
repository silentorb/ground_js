/// <reference path="interfaces.ts"/>
/// <reference path="Link_Trellis.ts"/>

module mining {

  export interface Query_Parts {
    fields:string
    from:string
    joins:string
    filters:string
    sorts:string
    pager:string
    args
    all_references:Embedded_Reference[]
    reference_hierarchy:Embedded_Reference[]
    dummy_references:Embedded_Reference[]
    field_list:Field_List
    query_id:number
  }

  export class Query_Renderer {
    schema:landscape.Schema
    static counter = 1

    constructor(schema:landscape.Schema) {
      this.schema = schema
    }

    static apply_arguments(sql:string, args):string {
      for (var pattern in args) {
        var value = args[pattern]
        sql = sql.replace(new RegExp(pattern, 'g'), value)
      }

      return sql
    }

    static generate_property_join(property:landscape.Property, seeds) {
      var join = Link_Trellis.create_from_property(property);
      console.log('join', property.name, seeds)
      return join.generate_join(seeds);
    }

    generate_sql(parts:Query_Parts, source:Query_Builder) {
      var sql = 'SELECT '
        + parts.fields
        + parts.from
        + parts.joins
        + parts.filters

      sql += "\nGROUP BY " + this.get_group_keys(source.trellis)

      sql += parts.sorts

      for (var i = 0; i < source.transforms.length; ++i) {
        var transform = source.transforms[i]
        var temp_table = 'transform_' + (i + 1)
        sql = 'SELECT * FROM (' + sql + ' ) ' + temp_table + ' ' + transform.clause
      }

      sql = Query_Renderer.apply_arguments(sql, parts.args)
      + parts.pager

      return sql;
    }

    private get_group_keys(trellis:landscape.Trellis):string {
      return trellis.table && trellis.table.primary_keys && trellis.table.primary_keys.length > 1
        ? trellis.table.primary_keys.map((k)=> trellis.get_table_query() + '.' + k).join(', ')
        : trellis.query_primary_key()
    }

    generate_count(parts:Query_Parts) {
      var sql = 'SELECT COUNT(*) AS total_number'
        + parts.from
        + parts.joins
        + parts.filters

      sql = Query_Renderer.apply_arguments(sql, parts.args)

      return sql;
    }

    generate_union(parts:Query_Parts, queries:string[], source:Query_Builder) {
      var alias = source.trellis.get_table_name()
      //var sql = 'SELECT DISTINCT * FROM ('
      var sql = '('
        + queries.join('\n)\nUNION\n(\n')
        + ')\n'
        + parts.filters.replace(/`?\w+`?\./g, '')
        + parts.sorts.replace(/`?\w+`?\./g, '')

      sql = Query_Renderer.apply_arguments(sql, parts.args)
      + parts.pager

      return sql;
    }

    generate_union_count(parts:Query_Parts, queries:string[], source:Query_Builder) {
      return 'SELECT 1024 AS total_number'
      //var alias = source.trellis.get_table_name()
      //var sql = 'SELECT COUNT(DISTINCT ' + source.trellis.query() + ') AS total_number FROM ('
      //  + queries.map((q)=> q.replace(/LIMIT\s+\d+/g, '')).join('\nUNION\n')
      //  + '\n) ' + alias + '\n'
      //  + parts.filters.replace(/`?\w+`?\./g, '')
      //  //+ parts.sorts
      //
      //sql = Query_Renderer.apply_arguments(sql, parts.args)
      //return sql;
    }

    generate_parts(source:Query_Builder, query_id:number = undefined):Query_Parts {
      var data = new Field_List(source)
      var data2 = Query_Renderer.build_filters(source, source.filters, this.schema, true)
      var sorts = source.sorts.length > 0
        ? Query_Renderer.render_sorts(source, data2)
        : null

      var fields = data.fields
      var joins = data.joins.concat(Join.render_paths(source.trellis, data2.property_joins))
      var args = data2.arguments
      var filters = data2.filters || []
      if (fields.length == 0)
        throw new Error('No authorized fields found for trellis ' + source.trellis.name + '.');

      if (typeof query_id === 'number') {
        fields.unshift(query_id.toString() + ' AS _query_id_')
      }

      return {
        fields: fields.join(",\n"),
        from: "\nFROM `" + source.trellis.get_table_name() + '`',
        joins: joins.length > 0 ? "\n" + joins.join("\n") : '',
        filters: filters.length > 0 ? "\nWHERE " + filters.join(" AND ") : '',
        sorts: sorts ? ' ' + sorts : '',
        pager: source.pager ? ' ' + Query_Renderer.render_pager(source.pager) : '',
        args: args,
        reference_hierarchy: data.reference_hierarchy,
        all_references: data.all_references,
        dummy_references: [],
        field_list: data,
        query_id: query_id
      }
    }

    //static render_filter(filter) {
    //  if (typeof filter == 'string') {
    //    return filter
    //  }
    //
    //  if (filter.type == 'or') {
    //    return "(" + filter.filters.map((x)=> Query_Renderer.render_filter(x)).join(" OR ") + ")"
    //  }
    //
    //  return "(" + filter.map((x)=> Query_Renderer.render_filter(x)).join(" AND ") + ")"
    //}

    private static add_path(path, trellis:landscape.Trellis, result:Internal_Query_Source):any[] {
      var property_chain = Query_Renderer.get_chain(path, trellis)
      return Query_Renderer.add_chain(property_chain, result)
    }

    public static get_chain(path, trellis:landscape.Trellis):landscape.Property[] {
      if (typeof path === 'string') {
        var parts = path_to_array(path)
        var property_chain = Join.path_to_property_chain(trellis, parts)
        var last = property_chain[property_chain.length - 1]
        if (last.other_trellis)
          property_chain.push(last.other_trellis.get_primary_property())

        return property_chain
      }
      else {
        return path
      }
    }

    private static add_chain(property_chain, result:Internal_Query_Source):landscape.Property[] {
      var property = property_chain[property_chain.length - 1]
      if (property.get_relationship() == landscape.Relationships.many_to_many || property_chain.length > 1) {
        result.property_joins = result.property_joins || []
        result.property_joins.push(property_chain)
      }

      return property_chain
    }

    private static build_filter(source:Query_Builder, filter, schema:landscape.Schema):Internal_Query_Source {
      var result:Internal_Query_Source = {
        filters: [],
        arguments: {},
        property_joins: []
      }
      var value = filter.value,
        operator:string = filter.operator || '=',
        reference:string

      var placeholder = ':' + filter.path.replace(/\./g, '_') + '_filter' + Query_Renderer.counter++

      if (Query_Renderer.counter > 10000)
        Query_Renderer.counter = 1

      var property_chain = Query_Renderer.add_path(filter.path, source.trellis, result)
      var property = property_chain[property_chain.length - 1]
      if (property.is_virtual) {
        reference = property.query_virtual()
        if (!reference)
          throw new Error("Cannot create filter with invalid virtual property: " + property.name + ".")
      }
      else if (property.get_relationship() == landscape.Relationships.many_to_many || property_chain.length > 1) {
        reference = Join.get_end_query(property_chain)
      }
      else {
        reference = property.query()
      }

      var operator_action = Query_Builder.operators[filter.operator]
      if (operator_action && typeof operator_action.render === 'function') {
        var data = {
          value: value,
          operator: operator,
          placeholder: placeholder,
          reference: reference
        }
        operator_action.render(result, filter, property, data)
        value = data.value
        placeholder = data.placeholder
        operator = data.operator
        reference = data.reference
      }
      else {
        if (value === null || (value === 'null' && property.type != 'string')) {
//        result.filters.push(property.query() + ' IS NULL');
//        return result;
          if (!operator || operator == '=')
            operator = 'IS'
          else if (operator == '!=')
            operator = 'IS NOT'

          value = 'NULL'
        }
        else {
          if (value !== null)
            value = schema.convert_value(value, property.type);
          value = property.get_sql_value(value)
        }
      }

      result.arguments[placeholder] = value;
      result.filters.push(reference + ' ' + operator + ' ' + placeholder)
      return result;
    }

    private static prepare_condition(source:Query_Builder, condition, schema:landscape.Schema):Internal_Query_Source {
      var result:Internal_Query_Source = {
        filters: [],
        arguments: {},
        property_joins: []
      }
      var value = condition.value,
        operator:string = condition.operator || '='

      var placeholder = ':' + condition.path.join('_') + '_filter' + Query_Renderer.counter++;
      if (Query_Renderer.counter > 10000)
        Query_Renderer.counter = 1

      var property_chain = Query_Renderer.add_path(condition.path, source.trellis, result)
      var property = property_chain[property_chain.length - 1]
      var reference = Join.get_end_query(property_chain)

      var operator_action = Query_Builder.operators[condition.operator]
      if (operator_action && typeof operator_action.render === 'function') {
        var data = {
          value: value,
          operator: operator,
          placeholder: placeholder,
          reference: reference
        }
        operator_action.render(result, condition, property, data)
        value = data.value
        placeholder = data.placeholder
        operator = data.operator
        reference = data.reference
      }
      else {
        if (value === null || (value === 'null' && property.type != 'string')) {
//        result.filters.push(property.query() + ' IS NULL');
//        return result;
          if (!operator || operator == '=')
            operator = 'IS'
          else if (operator == '!=')
            operator = 'IS NOT'

          value = 'NULL'
        }
        else {
          if (value !== null)
            value = schema.convert_value(value, property.type);
          value = property.get_sql_value(value)
        }
      }

      result.arguments[placeholder] = value;
      result.filters.push(reference + ' ' + operator + ' ' + placeholder)
      return result;
    }

    static build_filters(source:Query_Builder, filters:Query_Filter[], schema:landscape.Schema, is_root:boolean, mode:string = 'and'):Internal_Query_Source {
      var result = {
        filters: [],
        arguments: {},
        property_joins: []
      }
      for (var i in filters) {
        var filter = filters[i]

        var additions = typeof filter.type == 'string' && (filter.type == 'and' || filter.type == 'or')
          ? Query_Renderer.build_filters(source, filter.filters, schema, false, filter.type)
          : Query_Renderer.build_filter(source, filter, schema)

        Query_Renderer.merge_additions(result, additions)
      }

      if (!is_root && result.filters.length > 0) {
        var joiner = " " + mode.toUpperCase() + " "
        result.filters = ["(" + result.filters.join(joiner) + ")"]
      }

      return result
    }


    static merge_additions(original:Internal_Query_Source, additions:Internal_Query_Source):Internal_Query_Source {
      if (additions.filters.length)
        original.filters = original.filters.concat(additions.filters)

      if (additions.property_joins.length)
        original.property_joins = original.property_joins.concat(additions.property_joins)

      if (Object.keys(additions.arguments).length)
        MetaHub.extend(original.arguments, additions.arguments)

      return original
    }

    static render_sorts(source:Query_Builder, result:Internal_Query_Source):string {
      var sorts = source.sorts
      var trellis = source.trellis

      if (sorts.length == 0)
        return ''

      var properties = trellis.get_all_properties()

      var items = sorts.map((sort)=> {
        var sql
        if (sort.path) {
          var property_chain = Query_Renderer.add_path(sort.path, trellis, result)
          var property = property_chain[property_chain.length - 1]

          sql = property.is_virtual
            ? property.get_field_name()
            : Join.get_end_query(property_chain)
        }
        else {
          if (!properties[sort.property])
            throw new Error(trellis.name + ' does not contain sort property: ' + sort.property)

          sql = properties[sort.property].query()
        }

        if (typeof sort.dir === 'string') {
          var dir = sort.dir.toUpperCase()
          if (dir == 'ASC')
            sql += ' ASC'
          else if (dir == 'DESC')
            sql += ' DESC'
        }

        return sql
      })

      return items.length > 0
        ? 'ORDER BY ' + items.join(', ')
        : ''
    }

    static render_pager(pager:IPager):string {
      var offset = Math.round(pager.offset);
      var limit = Math.round(pager.limit);
      if (!offset) {
        if (!limit)
          return '';
        else
          return ' LIMIT ' + limit;
      }
      else {
        if (!limit)
          limit = 18446744073709551615;

        return ' LIMIT ' + offset + ', ' + limit;
      }
    }
  }
}