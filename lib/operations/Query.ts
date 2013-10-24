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

  export interface External_Query_Source {
    fields?
    filters?:any[]
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
    filters:string[] = []
    property_filters:{ [name: string]: Query_Filter; } = {};
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

    static log_queries:boolean = false
    public static operators = [
      '=',
      'LIKE',
      '!='
    ]

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

      this.property_filters[property] = {
        property: property,
        value: value,
        operator: operator
      }
    }

    add_key_filter(value) {
      this.filters.push(this.trellis.query_primary_key() + ' = :primary_key');
      this.add_arguments({ ':primary_key': value });
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
      var data = this.get_fields_and_joins(properties)
      var data2 = this.process_property_filters()
      var fields = data.fields.concat(this.fields)
      var joins = data.joins.concat(this.joins, data2.joins)
      var args = MetaHub.concat(this.arguments,data2.arguments)
      var filters = this.filters.concat(data2.filters)

      if (fields.length == 0)
        throw new Error('No authorized fields found for trellis ' + this.main_table + '.');

      var sql = 'SELECT ';
      sql += fields.join(",\n");
      sql += "\nFROM " + this.main_table;
      if (joins.length > 0)
        sql += "\n" + joins.join("\n");

      if (this.filters.length > 0)
        sql += "\nWHERE " + this.filters.join(" AND ")

      if (this.post_clauses.length > 0)
        sql += " " + this.post_clauses.join(" ")

      // Temporary fix to simulate prepared statements.  Banking on the mysql module supporting them soon.

      for (var pattern in args) {
        var value = args[pattern];
        sql = sql.replace(new RegExp(pattern), Property.get_field_value_sync(value));
      }

      for (var i = 0; i < this.wrappers.length; ++i) {
        var wrapper = this.wrappers[i]
        sql = wrapper.start + sql + wrapper.end
      }
      return sql;
    }

    get_fields_and_joins(properties:{ [name: string]: Property }, include_primary_key:boolean = true):Internal_Query_Source {
      var name, fields:string[] = [];
      var trellises:{ [name: string]: Trellis } = {};
      for (name in properties) {
        var property = properties[name];
        // Virtual properties aren't saved to the database
        // Useful when you define custom serialization hooks
        if (property.type == 'list' || property.is_virtual)
          continue;

        if (property.name != this.trellis.primary_key || include_primary_key) {
          var field_name = property.get_field_name();
          var sql = property.query();
          if (field_name != property.name)
            sql += ' AS `' + property.name + '`';

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

    generate_property_join(property:Property, seed) {
      var join = new Link_Trellis(property);
      return join.generate_join(seed);
    }

    get_many_list(seed, id, property:Property, relationship:Relationships):Promise {
      var other_property = property.get_other_property();
      var query = new Query(other_property.parent, this.get_path(property.name));
      query.include_links = false;
      query.expansions = this.expansions;
      if (relationship === Relationships.many_to_many)
        query.add_join(query.generate_property_join(property, seed));
      else if (relationship === Relationships.one_to_many)
        query.add_property_filter(other_property.name, id);

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
      var query = new Query(property.other_trellis, this.get_path(property.name));
      query.include_links = false;
      query.expansions = this.expansions;
      query.add_filter(property.other_trellis.query_primary_key() + ' = ' + row[property.name]);
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

    process_row(row, authorized_properties = null):Promise {
      var name, property, promise, promises = [];
      // Map field names to Trellis property names
      for (name in this.trellis.properties) {
        property = this.trellis.properties[name];
        var field_name = property.get_field_name();
        if (property.name != field_name && row[field_name] !== undefined) {
          row[property] = row[field_name];
          delete row[field_name];
        }
      }

      if (authorized_properties) {
        for (name in authorized_properties) {
          property = authorized_properties[name];
          if (row[property.name] !== undefined)
            row[property.name] = this.ground.convert_value(row[property.name], property.type);
        }
      }

      var links = this.trellis.get_all_links((p)=> !p.is_virtual);

      for (name in links) {
        property = links[name];

        var path = this.get_path(property.name);
        if (authorized_properties && authorized_properties[name] === undefined)
          continue;

        if (this.include_links || this.has_expansion(path)) {
          var id = row[property.parent.primary_key];
          var relationship = property.get_relationship();

          switch (relationship) {
            case Relationships.one_to_one:
              promise = this.get_reference_object(row, property)
              break;
            case Relationships.one_to_many:
            case Relationships.many_to_many:
              promise = this.get_many_list(row, id, property, relationship)
              break;
          }

          promise = promise.then((value) => row[name] = value)
          promises.push(promise);
        }
      }

      return when.all(promises)
        .then(()=> this.ground.invoke(this.trellis.name + '.process.row', row, this, this.trellis))
        .then(()=> row)
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

      if (property.get_relationship() == Relationships.many_to_many) {
        var join_seed = {}
        join_seed[property.name] = ':' + property.name + '_filter'

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

    run(args = {}):Promise {
      var properties = this.trellis.get_all_properties();
      var tree = this.trellis.get_tree()
      var promises = tree.map((trellis:Trellis) => this.ground.invoke(trellis.name + '.query', this));

      return when.all(promises)
        .then(()=> {
          var sql = this.generate_sql(properties);
          sql = sql.replace(/\r/g, "\n");
          if (Query.log_queries)
            console.log('query', sql);

          var args = MetaHub.values(this.arguments).concat(args);
          return this.db.query(sql)
            .then((rows) => when.all(rows.map((row) => this.process_row(row, properties))))
        });
    }

    run_as_service(arguments = {}):Promise {
      var properties = this.trellis.get_all_properties();
      var sql = this.generate_sql(properties);
      sql = sql.replace(/\r/g, "\n");
      if (Query.log_queries)
        console.log('query', sql);

      var args = MetaHub.values(this.arguments).concat(arguments);
      return this.db.query(sql)
        .then((rows) => when.all(rows.map((row) => this.process_row(row, properties))))
        .then((rows):IService_Response => {
          return {
            objects: rows
          }
        });
    }
  }
}