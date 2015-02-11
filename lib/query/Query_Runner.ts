/// <reference path="../references.ts"/>

module Ground {

  export interface IQuery_Preparation {
    queries?:string[]
    is_empty:boolean
  }

  export interface IQuery_Render_Result {
    sql:string
    parts
  }

  interface Trellis_Cache {
    links
    tree
  }

  export class Query_Runner {
    source:Query_Builder
    run_stack
    private row_cache
    ground:Core
    renderer:Query_Renderer
    static trellis_cache:any = {}

    constructor(source:Query_Builder) {
      this.source = source
      this.ground = source.ground
      this.renderer = new Query_Renderer(this.ground)
    }

    private static generate_property_join(property:Property, seeds) {
      var join = Link_Trellis.create_from_property(property);
      return join.generate_join(seeds);
    }

    private static create_sub_query(trellis:Trellis, property:Property, source:Query_Builder):Query_Builder {
      var query = new Query_Builder(trellis)
      var original_query = source.subqueries[property.name]
      if (original_query) {
        MetaHub.extend(query.subqueries, original_query.subqueries)
        if (original_query.source)
          query.extend(original_query.source)
      }
      else if (typeof source.properties === 'object'
        && typeof source.properties[property.name] === 'object') {
        query.extend(source.properties[property.name])
      }
      query.include_links = false;

      return query
    }

    private static get_many_list(seed, property:Property, relationship:Relationships, source:Query_Builder, query_result:Query_Result):Promise {
      var id = seed[property.parent.primary_key]
      if (id === undefined || id === null) {
        return when.resolve({
          objects: []
        })
      }
        //throw new Error('Cannot get many-to-many list when seed id is null for property ' + property.fullname())

      var other_property = property.get_other_property();
      if (!other_property)
        throw new Error("Could not find other property for " + property.fullname() + ".")
//        return when.resolve()

      var query = Query_Runner.create_sub_query(other_property.parent, property, source);
//      if (relationship === Relationships.many_to_many) {
////        query.filters.push(Query_Builder.create_join_filter(property, seed))
//        query.add_filter(property.name, seed)
//      }
//      else if (relationship === Relationships.one_to_many)
//        query.add_filter(other_property.name, id)

      query.add_filter(other_property.name, id)
      return query.run(query_result.user, query_result);
    }

//    private static get_path(...args:string[]):string {
//      var items:string[] = [];
////      if (this.base_path)
////        items.push(this.base_path);
//
//      items = items.concat(args);
//      return items.join('/');
//    }

    private static get_reference_object(row, property:Property, source:Query_Builder, query_result:Query_Result) {
      var query = Query_Runner.create_sub_query(property.other_trellis, property, source)
      var value = row[property.name]
      if (!value)
        return when.resolve(value)

      query.add_key_filter(value);
      return query.run(query_result.user, query_result)
        .then((result) => result.objects[0])
    }

    process_map(row, source:Query_Builder, links, query_result:Query_Result) {
      var replacement = undefined
      var all_properties = source.trellis.get_all_properties()
      var context = {
//          properties: source.trellis.get_all_properties()
        properties: row
      }
      for (var i in source.map) {
        var expression = source.map[i]
        var value = Expression_Engine.resolve(expression, context)
        if (i == 'this') {
          replacement = value
          break
        }
        if (value !== undefined)
          row[i] = value
      }
//      MetaHub.map_to_array(links, (property, name) => {
//        if (property.is_composite_sub)
//          return null
//
////        var path = Query_Runner.get_path(property.name)
//        var subquery = source.subqueries[property.name]
//
//        if (source.include_links || subquery) {
//          return this.query_link_property(row, property, source, query_result).then((value) => {
//            row[name] = value
//            return row
//          })
//        }
//
//        return null
//      })

      return replacement
    }

    process_row_step_one(row, source:Query_Builder, query_result:Query_Result, parts:Query_Parts):Promise {
      var type_property = source.trellis.type_property

      var trellis = type_property && row[type_property.name]
        ? this.ground.sanitize_trellis_argument(row[type_property.name])
        : source.trellis

      if (trellis != source.trellis) {
        var query = new Query_Builder(trellis)
        query.add_key_filter(trellis.get_identity2(row))
        if (source.properties)
          query.properties = source.properties
        if (source.map)
          query.map = source.map

        return query.run_single(query_result.user, query_result)
          .then((row)=> this.process_row_step_two(row, source, trellis, query_result, parts))
      }
      else {
        return this.process_row_step_two(row, source, trellis, query_result, parts)
      }
    }

    process_row_step_two(row, source:Query_Builder, trellis:Trellis, query_result:Query_Result, parts:Query_Parts):Promise {
      var name, property, replacement = undefined

      var properties = trellis.get_core_properties()
      for (name in properties) {
        property = properties[name]
        var value = row[property.name]
        if (value === undefined)
          continue

        if (property.type == 'json') {
          if (!value) {
            row[property.name] = null
          }
          else {
            var bin = new Buffer(value, 'binary').toString()
            var json = new Buffer(bin, 'base64').toString('ascii');
            row[property.name] = JSON.parse(json);
          }
        }
        else {
          row[property.name] = this.ground.convert_value(value, property.type)
        }
      }

      for (var i in parts.reference_hierarchy) {
        parts.reference_hierarchy[i].cleanup_entity(row, row)
      }

      var dummy_references = parts.dummy_references
      if (dummy_references) {
        //console.log('dummy', dummy_references)
        for (var i in dummy_references) {
          delete row[dummy_references[i]]
        }
      }

      delete row['_query_id_']

      var cache = Query_Runner.get_trellis_cache(trellis)
//      var links = trellis.get_all_links((p)=> !p.is_virtual);
//      var tree = trellis.get_tree().filter((t:Trellis)=> !t.is_virtual);
//console.log('k', cache.tree.map((t)=> t.name))
      var promises = MetaHub.map_to_array(cache.links, (property, name) => {
        if (property.is_composite_sub)
          return null

        var subquery = source.subqueries[property.name]

        if (property.type == 'list' && (source.include_links || subquery)) {
          return this.query_link_property(row, property, source, query_result).then((value) => {
            row[name] = value
            return row
          })
        }
        else if (property.type == 'reference' && subquery) {
          return this.process_reference_children(row[property.name], subquery, query_result)
            .then(()=> row)
        }

        return null
      })

      if (typeof source.map === 'object' && Object.keys(source.map).length > 0) {
        replacement = this.process_map(row, source, cache.links, query_result)
      }

      var sequence:any = require('when/sequence')
      return when.all(promises)
        .then(() => sequence(cache.tree.map((trellis) => ()=> this.ground.invoke(trellis.name + '.queried', row, this, query_result))))
//        .then(()=> this.ground.invoke(trellis.name + '.queried', row, this))
        .then(()=> replacement === undefined ? row : replacement)
    }

    process_reference_children(child, query:Query_Builder, query_result:Query_Result):Promise {
      if (!child)
        return when.resolve()

      var promises = []

      for (name in query.subqueries) {
        var property = query.trellis.get_property(name)
        var subquery = query.subqueries[name]
        promises.push(()=>
            property.type == 'list'
              //? subquery.run(query_result)
              ? Query_Runner.get_many_list(child, property, property.get_relationship(), subquery, query_result)
              .then((result)=> {
                child[property.name] = result.objects
              })
              : this.process_reference_children(child[property.name], subquery, query_result)
              //: subquery.run_single(query_result)
              //.then((row)=> {
              //  child[property.name] = row
              //})
        )
      }

      var sequence = require('when/sequence')
      return sequence(promises)
    }

    private static get_trellis_cache(trellis):Trellis_Cache {
      var cache = Query_Runner.trellis_cache[trellis.name]
      if (!cache) {
        Query_Runner.trellis_cache[trellis.name] = cache = {
          links: trellis.get_all_links((p)=> !p.is_virtual),
          tree: trellis.get_tree().filter((t:Trellis)=> !t.is_virtual)
        }
      }

      return cache
    }

    query_link_property(seed, property, source:Query_Builder, query_result:Query_Result):Promise {
      var relationship = property.get_relationship()

      switch (relationship) {
        case Relationships.one_to_one:
          return Query_Runner.get_reference_object(seed, property, source, query_result)
          break
        case Relationships.one_to_many:
        case Relationships.many_to_many:
          return Query_Runner.get_many_list(seed, property, relationship, source, query_result)
            .then((result)=> result ? result.objects : [])
          break
      }

      throw new Error('Could not find relationship: ' + relationship + '.')
    }

    prepare(query_id:number = undefined):Promise {
      var source = this.source
      if (this.row_cache)
        return when.resolve(this.row_cache)

      var tree = source.trellis.get_tree().filter((t)=> this.ground['has_event'](t.name + '.query'))
      var promises = tree.map((trellis:Trellis) => ()=> this.ground.invoke(trellis.name + '.query', source))
      if (this.ground['has_event']('*.query'))
        promises = promises.concat(()=> this.ground.invoke('*.query', source))

      var is_empty = false

      if (source.filters) {
        for (var i in source.filters) {
          var filter = source.filters[i]
          var operator_action = Query_Builder.operators[filter.operator]
          if (operator_action && typeof operator_action.prepare === 'function') {
            if (filter.property) {
              var property = source.trellis.sanitize_property(filter.property);
              promises.push(()=> operator_action.prepare(filter, property)
                  .then((result) => {
                    if (result === false)
                      is_empty = true
                  })
              )
            }
          }
        }
      }
      var sequence = require('when/sequence')
      return sequence(promises)
        .then(()=> {
          return is_empty
            ? null
            : this.renderer.generate_parts(source, query_id)
        })
    }

    render(parts):Promise {
      if (!parts)
        return when.resolve(null)

      var source = this.source
      return this.ground.invoke(source.trellis.name + '.query.sql', parts, source)
        .then(()=> source.type == 'union'
          ? this.render_union(parts)
          : when.resolve({sql: this.renderer.generate_sql(parts, source), queries: []})
      )
        .then((render_result)=> {
          var sql = render_result.sql

          sql = sql.replace(/\r/g, "\n")
          if (this.ground.log_queries)
            console.log('\nquery', sql + '\n')

          return {
            sql: sql,
            parts: parts,
            queries: render_result.queries,
            parts_list: render_result.parts_list
          }
        })
    }

    render_union(parts):Promise {
      var sequence = require('when/sequence')
      var queries:string[] = []
      var query_index = 0
      var runner_parts = []
      var promises = this.source.queries.map((query)=> ()=> {
        var runner = new Query_Runner(query)
        if (this.source.pager && this.source.pager.limit) {
          query.pager = {
            limit: (this.source.pager.limit || 0) + (this.source.pager.offset || 0)
          }
        }
        return runner.prepare(query_index++)
          .then((parts)=> {
            runner_parts.push({
              runner: runner,
              parts: parts
            })
          })
      })
        .concat(()=> when.resolve(this.normalize_union_fields(runner_parts)))
        .concat(()=> sequence(runner_parts.map((runner_part)=> ()=> {
            return runner_part.runner.render(runner_part.parts)
              .then((render_result)=> {
                queries.push(render_result.sql)
              })
          })
        ))
      return sequence(promises)
        .then(()=> {
          //console.log('runner_parts', runner_parts.length)
          var parts_list = []
          for (var i = 0; i < runner_parts.length; ++i) {
            //parts_list[runner_parts[i].parts.query_id] = runner_parts[i].parts
            parts_list.push(runner_parts[i].parts)
          }
          return {
            sql: this.renderer.generate_union(parts, queries, this.source),
            queries: queries,
            parts_list: parts_list
          }
        })
    }

    static hack_field_alias(field:string):string {
      var match = field.match(/\w+`?\s*$/)
      if (!match)
        throw new Error("Could not find alias in field SQL: " + field)

      return match[0].replace(/\s*`/g, '')
    }

    normalize_union_fields(runner_parts) {
      var field_lists:Field_List[] = runner_parts.map((x)=> x.parts.field_list)
      var field_list_length = field_lists.length

      var field_names = ['_query_id_']
      var aliases = []

      for (var i = 0; i < field_list_length; ++i) {
        var field_list = field_lists[i]
        var alias_list = {}
        for (var f in field_list.fields) {
          var field = field_list.fields[f]
          var alias = Query_Runner.hack_field_alias(field)
          alias_list[alias] = field
          if (field_names.indexOf(alias) == -1)
            field_names.push(alias)
        }

        aliases.push(alias_list)
      }

      field_names = field_names.sort()

      for (var i = 0; i < field_list_length; ++i) {
        var field_list = field_lists[i]
        var alias_list:{} = aliases[i]
        var parts = runner_parts[i].parts
        parts.dummy_references = field_names.filter((name)=> alias_list[name] == undefined)
        //console.log('dummy', parts.dummy_references)
        parts.fields = field_names.map((name)=>
          alias_list[name] || 'NULL AS `' + name + '`'
        ).join(',\n')

        //for (var f in field_names) {
        //  var field_name = field_names[f]
        //  if (alias_list.indexOf(field_name) == -1)
        //    parts.fields += 'NULL AS `' + field_name + '`'
        //
        //  parts.dummy_references.push(field_name)
        //}
      }
    }

    get_source(row):Query_Builder {
      if (this.source.type !== 'union')
        return this.source

      return this.source.queries[row._query_id_]
    }

    get_parts(row, render_result):Query_Parts {
      if (this.source.type !== 'union')
        return render_result.parts

      return render_result.parts_list[row._query_id_]
    }

    run(query_result:Query_Result):Promise {
      if (this.ground.log_queries) {
        var temp = new Error()
        this.run_stack = temp['stack']
      }

      return this.prepare()
        .then((parts)=> this.render(parts))
        .then((render_result)=> {
          if (!render_result.sql)
            return when.resolve([])

          return this.ground.db.query(render_result.sql)
            .then((rows)=> {
              var result:IService_Response = {
                objects: rows
              }
              //this.row_cache = result
              if (query_result.return_sql)
                result.sql = render_result.sql

              return this.paging(render_result, result)
                .then((result) => when.all(result.objects.map(
                  (row) => this.process_row_step_one(row, this.get_source(row), query_result, this.get_parts(row, render_result))))
                  .then((rows)=> {
                    result.objects = rows
                    result.query_stats = {count: query_result.query_count}
                    return result
                  })
              )
            })
        })
    }

    paging(render_result, result):Promise {
      if (!this.source.pager)
        return when.resolve(result)

      var sql = this.source.type != 'union'
        ? this.renderer.generate_count(render_result.parts)
        : this.renderer.generate_union_count(render_result.parts,
        render_result.queries, this.source)

      if (this.ground.log_queries)
        console.log('\nquery', sql + '\n')

      return this.ground.db.query_single(sql)
        .then((count)=> {
          result['total'] = count.total_number
          return result
        })
    }

    run_single(query_result:Query_Result):Promise {
      return this.run(query_result)
        .then((result)=> result.objects[0])
    }
  }
}