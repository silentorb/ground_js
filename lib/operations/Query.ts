/**
 * Created with JetBrains PhpStorm.
 * User: Chris Johnson
 * Date: 9/18/13
 */
/// <reference path="../references.ts"/>

module Ground {

  interface ILink {
    other:Trellis
    property:Property
  }

  export interface IService_Response {
    objects:any[]
  }

  export interface Query_Filter {
    property:string
    value
    operator?:string
  }

  export interface Query_Sort {
    property
    dir?
  }

  export interface Query_Wrapper {
    start:string
    end:string
  }

  export interface Property_Query_Source {
    filters?:Query_Filter[]
    sorts?:Query_Sort[]
    expansions?:string[]
    reductions?:string[]
    properties?:Property_Query_Source[]
  }

  export interface External_Query_Source extends Property_Query_Source {
    trellis:string;
  }

  export interface Internal_Query_Source {
    fields?
    filters?:any[]
    joins?:string[]
    arguments?

  }

  export class Query {
    ground:Core;
    main_table:string
    joins:string[] = []
    post_clauses:any[] = []
    limit:string
    trellis:Trellis
    db:Database
    include_links:boolean = true
    fields:string[] = []
    base_path:string
    arguments = {}
    expansions:string[] = []
    wrappers:Query_Wrapper[] = []
    private row_cache
    type:string = 'query'
    properties
    source:External_Query_Source

    filters:string[] = []

    property_filters:Query_Filter[] = []

    public static operators = [
      '=',
      'LIKE',
      '!='
    ]
    each
    private links:ILink[] = []

    constructor(trellis:Trellis, base_path:string = null) {
      this.trellis = trellis;
      this.ground = trellis.ground;
      this.db = this.ground.db;
      this.main_table = trellis.get_table_name();
      if (base_path)
        this.base_path = base_path;
      else
        this.base_path = this.trellis.name;
    }

    add_arguments(args) {
      for (var a in args) {
        this.arguments[a] = args[a];
      }
    }

    add_filter(clause:string, arguments:any[] = null) {
      this.filters.push(clause);
      if (arguments)
        this.add_arguments(arguments);
    }

    add_property_filter(property:string, value = null, operator:string = '=') {
      if (Query.operators.indexOf(operator) === -1)
        throw new Error("Invalid operator: '" + operator + "'.")

      if (value === null || value === undefined)
        throw new Error('Cannot add property filter where value is null')

      this.property_filters.push({
        property: property,
        value: value,
        operator: operator
      })
    }

    add_key_filter(value) {
      this.add_property_filter(this.trellis.primary_key, value)
//      this.filters.push(this.trellis.query_primary_key() + ' = :primary_key');
//      this.add_arguments({ ':primary_key': value });
    }

    add_field(clause:string, arguments = null) {
      this.fields.push(clause);
      if (arguments) {
        this.add_arguments(arguments);
      }
    }

    add_join(clause:string, arguments = null) {
      this.joins.push(clause);
      if (arguments) {
        this.add_arguments(arguments);
      }
    }

    add_post(clause:string, arguments = null) {
      this.post_clauses.push(clause);
      if (arguments) {
        this.add_arguments(arguments);
      }
    }

    add_expansion(clause) {
      this.expansions.push(clause);
    }

    add_link(property) {
      property = this.trellis.sanitize_property(property);
      if (this.links[property.name])
        throw new Error(property.name + ' added twice to query.');

      var link:ILink = {
        other: property.get_referenced_trellis(),
        property: property
      };

      this.links[property.name] = link;
    }

    add_sort(sort:Query_Sort) {
      if (!this.trellis.properties[sort.property])
        throw new Error(this.trellis.name + ' does not contain sort property: ' + sort.property)

      var sql = this.trellis.properties[sort.property].name

      if (typeof sort.dir === 'string') {
        var dir = sort.dir.toUpperCase()
        if (dir == 'ASC')
          sql += ' ASC'
        else if (dir == 'DESC')
          sql += ' DESC'
      }

      return sql
    }

    add_wrapper(wrapper:Query_Wrapper) {
      this.wrappers.push(wrapper)
    }

    generate_pager(offset:number = 0, limit:number = 0):string {
      offset = Math.round(offset);
      limit = Math.round(limit);
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

    generate_sql(properties):string {
      var filters
      var data = this.get_fields_and_joins(properties)
      var data2 = this.process_property_filters()
      var fields = data.fields.concat(this.fields)
      var joins = data.joins.concat(this.joins, data2.joins)
      var args = MetaHub.concat(this.arguments, data2.arguments)
      if (data2.filters)
        filters = this.filters.concat(data2.filters)
      else
        filters = this.filters

      if (fields.length == 0)
        throw new Error('No authorized fields found for trellis ' + this.main_table + '.');

      var sql = 'SELECT '
      sql += fields.join(",\n")
      sql += "\nFROM " + this.main_table
      if (joins.length > 0)
        sql += "\n" + joins.join("\n")

      if (filters.length > 0)
        sql += "\nWHERE " + filters.join(" AND ")

      if (this.post_clauses.length > 0)
        sql += " " + this.post_clauses.join(" ")

      // Temporary fix to simulate prepared statements.  Banking on the mysql module supporting them soon.

//      if (sql.indexOf(':') > -1) {
//        throw new Error('Missing prepared statement argument:' + sql)
//      }

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

    get_fields_and_joins(properties:{ [name: string]: Property
    }, include_primary_key:boolean = true):Internal_Query_Source {
      var name, fields:string[] = [];
      var trellises:{ [name: string]: Trellis
      } = {};
      for (name in properties) {
        var property = properties[name];
        // Virtual properties aren't saved to the database
        // Useful when you define custom serialization hooks
        if (property.type == 'list' || property.is_virtual)
          continue;

        if (property.name != this.trellis.primary_key || include_primary_key) {
          var sql = property.get_field_query()
          fields.push(sql);
          trellises[property.parent.name] = property.parent;
        }
      }
      var joins = [];
      for (name in trellises) {
        var trellis = trellises[name];
        var join = trellis.get_join(this.main_table);
        if (join)
          joins.push(join);
      }

      return {
        fields: fields,
        joins: joins
      }
    }

    generate_property_join(property:Property, seeds) {
      var join = Link_Trellis.create_from_property(property);
      return join.generate_join(seeds);
    }

    create_sub_query(trellis:Trellis, property:Property):Query {
      var query = new Query(trellis, this.get_path(property.name));
      query.include_links = false;
      query.expansions = this.expansions;
      var source = this.source
      if (typeof source === 'object'
        && typeof source.properties === 'object'
        && typeof source.properties[property.name] === 'object') {
        query.extend(source.properties[property.name])
      }

      return query
    }

    get_many_list(seed, property:Property, relationship:Relationships):Promise {
      var id = seed[property.parent.primary_key]
      if (id === undefined || id === null)
        throw new Error('Cannot get many-to-many list when seed id is null.')

      var other_property = property.get_other_property();
      var query = this.create_sub_query(other_property.parent, property);
      if (relationship === Relationships.many_to_many) {
        var seeds = {}
        seeds[this.trellis.name] = seed
        query.add_join(query.generate_property_join(property, seeds))
      }
      else if (relationship === Relationships.one_to_many)
        query.add_property_filter(other_property.name, id)

      return query.run();
    }

    get_path(...args:string[]):string {
      var items:string[] = [];
      if (this.base_path)
        items.push(this.base_path);

      items = items.concat(args);
      return items.join('/');
    }

    get_reference_object(row, property:Property) {
      var query = this.create_sub_query(property.other_trellis, property)
      query.add_key_filter(row[property.name]);
      return query.run()
        .then((rows) => rows[0])
    }

    has_expansion(path:string):boolean {
      for (var i = 0; i < this.expansions.length; ++i) {
        var expansion = this.expansions[i];
        // Check if the expansion is a regex
        if (expansion[0] == '/' && expansion[expansion.length - 1] == '/') {
          if (path.match(new RegExp(expansion)))
            return true;
        }
        else {
          if (path == expansion)
            return true;
        }
      }

      return false;
    }

    process_row(row):Promise {
      var name, property

      var properties = this.trellis.get_core_properties()
      for (name in properties) {
        property = properties[name]
        row[property.name] = this.ground.convert_value(row[property.name], property.type)
      }

      var links = this.trellis.get_all_links((p)=> !p.is_virtual);

      var promises = MetaHub.map_to_array(links, (property, name) => {
        var path = this.get_path(property.name)

        if (this.include_links || this.has_expansion(path)) {
          return this.query_link_property(row, property).then((value) => {
            row[name] = value
            return row
          })
        }

        return null
      })

      return when.all(promises)
        .then(()=> this.ground.invoke(this.trellis.name + '.process.row', row, this, this.trellis))
        .then(()=> row)
    }

    query_link_property(seed, property):Promise {
      var relationship = property.get_relationship()

      switch (relationship) {
        case Relationships.one_to_one:
          return this.get_reference_object(seed, property)
          break
        case Relationships.one_to_many:
        case Relationships.many_to_many:
          return this.get_many_list(seed, property, relationship)
          break
      }

      throw new Error('Could not find relationship: ' + relationship + '.')
    }

    process_property_filter(filter):Internal_Query_Source {
      var result = {
        filters: [],
        arguments: {},
        joins: []
      }
      var property = this.trellis.sanitize_property(filter.property);
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
//        var other_property = property.get_other_property()
//        join_seed[property.parent.name] =
        result.joins.push(this.generate_property_join(property, join_seed));
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

    process_property_filters():Internal_Query_Source {
      var result = {}
      for (var i in this.property_filters) {
        var filter = this.property_filters[i]
        MetaHub.extend(result, this.process_property_filter(filter))
      }
      return result
    }

    extend(source:External_Query_Source) {
      var i

      this.source = source

      if (source.filters) {
        for (i = 0; i < source.filters.length; ++i) {
          var filter = source.filters[i]
          this.add_property_filter(filter.property, filter.value, filter.operator)
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
        for (var key in source.properties) {
          if (properties[key])
            this.properties[key] = properties[key]
        }
      }
    }

    run_core():Promise {
      if (this.row_cache)
        return when.resolve(this.row_cache)

      var properties
      if (this.properties && this.properties.length > 0)
        properties = this.properties
      else
        properties = this.trellis.get_all_properties();

      var tree = this.trellis.get_tree()
      var promises = tree.map((trellis:Trellis) => this.ground.invoke(trellis.name + '.query', this));

      return when.all(promises)
        .then(()=> {
          var sql = this.generate_sql(properties);
          sql = sql.replace(/\r/g, "\n");
          if (this.ground.log_queries)
            console.log('query', sql);

//          var args = MetaHub.values(this.arguments).concat(args);
          return this.db.query(sql)
            .then((rows)=> {
              this.row_cache = rows
              return rows
            })
        })
    }

    run():Promise {
      var properties = this.trellis.get_all_properties();
      return this.run_core()
        .then((rows) => when.all(rows.map((row) => this.process_row(row))))
    }

    run_single():Promise {
      return this.run()
        .then((rows)=> rows[0])
    }

    static query_path(path:string, args, ground:Core):Promise {
      var sql = Query.follow_path(path, args, ground)
      return ground.db.query(sql)
    }

    // Returns a sql query string
    // The first token in the path is required to have an args entry
    // Or the
    static follow_path(path:string, args, ground:Core):string {
      var trellis

      if (typeof path !== 'string')
        throw new Error('query path must be a string.')

      path = path.trim()

      if (!path)
        throw new Error('Empty query path.')

      var tokens = path.split('/')
      var sql = 'SELECT '

      var parts = Query.process_tokens(tokens, args, ground)
      for (var i = 0; i < parts.length; ++i) {
        var part = parts[i]
      }

      return sql
    }

    private static process_tokens(tokens:string[], args, ground) {
      var result = []
      var trellis
      for (var i = 0; i < tokens.length; ++i) {
        var token = tokens[i]
        if (token[0] == ':') {
          var arg = args[token]
          trellis = arg.trellis
        }
      }

      return result
    }
  }
}