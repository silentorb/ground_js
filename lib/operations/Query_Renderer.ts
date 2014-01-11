/// <reference path="../references.ts"/>

module Ground {

  export class Query_Renderer {
    fields:string[] = []
    joins:string[] = []
    arguments = {}
    filters:string[] = []

    static get_properties(source:Query_Builder) {
      if (source.properties && Object.keys(source.properties).length > 0) {
        var properties = source.trellis.get_all_properties()
        return MetaHub.map(source.properties, (property, key)=> properties[key])
      }
      else {
        return source.trellis.get_all_properties()
      }
    }

    generate_sql(source:Query_Builder) {
      var properties = Query_Renderer.get_properties(source)
      var data = Query_Renderer.get_fields_and_joins(source, properties)
      var data2 = Query_Renderer.process_property_filters(source)
      var fields = data.fields.concat(this.fields)
      var joins = data.joins.concat(this.joins, data2.joins)
      var args = MetaHub.concat(this.arguments, data2.arguments)
      var filters = data2.filters ?
        this.filters.concat(data2.filters) : []

      if (fields.length == 0)
        throw new Error('No authorized fields found for trellis ' + source.trellis.name + '.');

      var sql = 'SELECT '
      sql += fields.join(",\n")
      sql += "\nFROM `" + source.trellis.get_table_name() + '`'
      if (joins.length > 0)
        sql += "\n" + joins.join("\n")

      if (filters.length > 0)
        sql += "\nWHERE " + filters.join(" AND ")

      if (this.sorts.length > 0)
        sql += ' ' + Query.process_sorts(this.sorts, source.trellis)

      if (this.post_clauses.length > 0)
        sql += " " + this.post_clauses.join(" ")

      for (var i = 0; i < this.wrappers.length; ++i) {
        var wrapper = this.wrappers[i]
        sql = wrapper.start + sql + wrapper.end
      }

      for (var pattern in args) {
        var value = args[pattern];
//        sql = sql.replace(new RegExp(pattern), Property.get_sql_value(value));
        sql = sql.replace(new RegExp(pattern), value);
      }

      return sql;
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


    private static process_property_filter(source:Query_Builder, filter):Internal_Query_Source {
      var result = {
        filters: [],
        arguments: {},
        joins: []
      }
      var property = source.trellis.sanitize_property(filter.property);
      var value = filter.value;

      var placeholder = ':' + property.name + '_filter';
      if (value === 'null' && property.type != 'string') {
        result.filters.push(property.query() + ' IS NULL');
        return result;
      }

      if (value !== null)
        value = this.ground.convert_value(value, property.type);

      if (value === null || value === undefined) {
        throw new Error('Query property filter ' + placeholder + ' is null.')
      }

      if (property.get_relationship() == Relationships.many_to_many) {
//        throw new Error('Filtering many to many will need to be rewritten for the new Link_Trellis.');
        var join_seed = {}
        join_seed[property.other_trellis.name] = ':' + property.name + '_filter'

        result.joins.push(Query.generate_property_join(property, join_seed));
      }
      else {
        if (filter.operator.toLowerCase() == 'like') {
          result.filters.push(property.query() + ' LIKE ' + placeholder);
          if (value !== null)
            value = '%' + value + '%';
        }
        else {
          result.filters.push(property.query() + ' = ' + placeholder);
        }
      }

      if (value !== null) {
        value = property.get_sql_value(value)
        result.arguments[placeholder] = value;
      }

      return result;
    }

  static process_property_filters(source:Query_Builder):Internal_Query_Source {
      var result = {}
      for (var i in this.property_filters) {
        var filter = this.property_filters[i]
        MetaHub.extend(result, Query_Renderer.process_property_filter(source, filter))
      }
      return result
    }

  }
}