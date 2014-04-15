/// <reference path="../references.ts"/>

module Ground {

  export interface Join {
    property?:Property
    first:Trellis
    second:Trellis
  }

  export class Query_Renderer {
    ground:Core
//    fields:string[] = []
//    joins:string[] = []
//    arguments = {}
//    filters:string[] = []
//    post_clauses:any[] = []

    static counter = 1

    constructor(ground:Core) {
      this.ground = ground
    }

    static get_properties(source:Query_Builder) {
      if (source.properties && Object.keys(source.properties).length > 0) {
        var properties = source.trellis.get_all_properties()
        return MetaHub.map(source.properties, (property, key)=> properties[key])
      }
      else {
        return source.trellis.get_all_properties()
      }
    }

    static generate_property_join(property:Property, seeds) {
      var join = Link_Trellis.create_from_property(property);
      console.log('join', property.name, seeds)
      return join.generate_join(seeds);
    }

    generate_sql(parts, source:Query_Builder) {
      var sql = 'SELECT '
      + parts.fields
      + parts.from
      + parts.joins
      + parts.filters
      + parts.sorts

      for (var i = 0; i < source.transforms.length; ++i) {
        var transform = source.transforms[i]
        var temp_table = 'transform_' + (i + 1)
        sql = 'SELECT * FROM (' + sql + ' ) ' + temp_table + ' ' + transform.clause
      }

      var args = parts.args
      for (var pattern in args) {
        var value = args[pattern]
        sql = sql.replace(new RegExp(pattern, 'g'), value)
      }

      sql += parts.pager

      return sql;
    }

    generate_count(parts) {
      var sql = 'SELECT COUNT(*) AS total_number'
        + parts.from
        + parts.joins
        + parts.filters

      return sql;
    }

    generate_parts(source:Query_Builder) {
      var properties = Query_Renderer.get_properties(source)
      var data = Query_Renderer.get_fields_and_joins(source, properties)
      var data2 = Query_Renderer.process_property_filters(source, this.ground)
      var fields = data.fields
      var joins = data.joins.concat(data2.joins)
      var args = data2.arguments
      var filters = data2.filters || []

      if (fields.length == 0)
        throw new Error('No authorized fields found for trellis ' + source.trellis.name + '.');

      return {
        fields: fields.join(",\n"),
        from: "\nFROM `" + source.trellis.get_table_name() + '`',
        joins: joins.length > 0 ? "\n" + joins.join("\n") : '',
        filters: filters.length > 0 ? "\nWHERE " + filters.join(" AND ") : '',
        sorts: source.sorts.length > 0 ? ' ' + Query_Renderer.process_sorts(source.sorts, source.trellis) : '',
        pager: source.pager ? ' ' + Query_Renderer.render_pager(source.pager) : '',
        args: args
      }
    }

    private static get_fields_and_joins(source:Query_Builder, properties, include_primary_key:boolean = true):Internal_Query_Source {
      var name, fields:string[] = [];
      var trellises = {};
      for (name in properties) {
        var property = properties[name];
        // Virtual properties aren't saved to the database
        // Useful when you define custom serialization hooks
        if (property.type == 'list' || property.is_virtual)
          continue;

        if (property.name != source.trellis.primary_key || include_primary_key) {
          var sql = property.get_field_query()
          fields.push(sql);
          if (property.parent.name != source.trellis.name)
            trellises[property.parent.name] = property.parent
        }
      }
      var joins = [];
      for (name in trellises) {
        var trellis = trellises[name];
        var join = source.trellis.get_ancestor_join(trellis);
        if (join)
          joins.push(join);
      }

      return {
        fields: fields,
        joins: joins
      }
    }

    private static process_property_filter(source:Query_Builder, filter, ground:Core):Internal_Query_Source {
      var result = {
        filters: [],
        arguments: {},
        joins: []
      }
      var property = source.trellis.sanitize_property(filter.property);
      var value = filter.value;

      var placeholder = ':' + property.name + '_filter' + Query_Renderer.counter++;
      if (Query_Renderer.counter > 10000)
        Query_Renderer.counter = 1

      if (value === 'null' && property.type != 'string') {
        result.filters.push(property.query() + ' IS NULL');
        return result;
      }

      if (value !== null)
        value = ground.convert_value(value, property.type);

      if (value === null || value === undefined) {
        throw new Error('Query property filter ' + placeholder + ' is null.')
      }

      if (property.get_relationship() == Relationships.many_to_many) {
//        throw new Error('Filtering many to many will need to be rewritten for the new Link_Trellis.');
        var join_seed = {}, s = {}
        s[property.other_trellis.primary_key] = placeholder
        join_seed[property.other_trellis.name] = s

        result.joins.push(Query_Renderer.generate_property_join(property, join_seed));
      }
      else {
        var operator_action = Query_Builder.operators[filter.operator]
        if (operator_action && typeof operator_action.render === 'function') {
          var data = {
            value: value,
            placeholder: placeholder
          }
          operator_action.render(result, filter, property, data)
          value = data.value
          placeholder = data.placeholder
        }
        else {
          result.filters.push(property.query() + ' ' + filter.operator + ' ' + placeholder);
        }
      }

      if (value !== null) {
        value = property.get_sql_value(value)
        result.arguments[placeholder] = value;
      }

      return result;
    }

    static process_property_filters(source:Query_Builder, ground:Core):Internal_Query_Source {
      var result = {
        filters: [],
        arguments: {},
        joins: []
      }
      for (var i in source.filters) {
        var filter = source.filters[i]
        var additions = Query_Renderer.process_property_filter(source, filter, ground)

        if (additions.filters.length)
          result.filters = result.filters.concat(additions.filters)

        if (additions.joins.length)
          result.joins = result.filters.concat(additions.joins)

        if (Object.keys(additions.arguments).length)
          MetaHub.extend(result.arguments, additions.arguments)
      }
      return result
    }

    static process_sorts(sorts:Query_Sort[], trellis:Trellis):string {
      if (sorts.length == 0)
        return ''

      if (trellis)
        var properties = trellis.get_all_properties()

      var items = sorts.map((sort)=> {
        var sql
        if (trellis) {
          if (!properties[sort.property])
            throw new Error(trellis.name + ' does not contain sort property: ' + sort.property)

          sql = properties[sort.property].query()
        }
        else {
          sql = sort.property
        }

        if (typeof sort.dir === 'string') {
          var dir = sort.dir.toUpperCase()
          if (dir == 'ASC')
            sql += ' ASC'
          else if (dir == 'DESC')
            sql += ' DESC'
        }

        return 'ORDER BY ' + sql
      })

      return items.join(', ')
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

    static add_join(joins, join:Join) {

      // Check if a matching join already exists in the list
      // (I may be pushing my luck with these comparison operators
      //  and need to write out more detailed comparisons.)
      for (var i in joins) {
        var j = <Join>joins[i]
        if (j.property === join.property
          && j.first === join.first
          && j.second === join.second)
          return
      }

      joins.push(join)
    }

    static get_join_table(join:Join):string {
      if (join.property)
        return "Join_" + join.first.name + "_" + join.property.name

      return "Composite_Join_" + join.first.name + "_" + join.second.name
    }

//    static render_join(join:Join):string {
//      var table_name = Query_Renderer.get_join_table(join)
//      if (join.property) {
//        var link = Link_Trellis.create_from_property(join.property);
//        link.alias = table_name
//        return link.generate_join({});
//      }
//      else {
//        return 'JOIN ' + join.first.get_table_name() + ' ' + table_name
//          + ' ON ' + this.get_condition_string({}) + "\n"
//      }
//    }
  }
}