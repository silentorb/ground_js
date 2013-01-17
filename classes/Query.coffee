MetaHub = require 'metahub'
Meta_Object = MetaHub.Meta_Object

Query = Meta_Object.subclass 'Query',
  trellises: []
  main_table: 'node'
  joins: []
  filters: []
  post_clauses: []
  limit: ''
  sources: []
  links: []
  trellis: ''
  db: ''
  initialize: (trellis, include_links)->
    if get_class(trellis) != 'Trellis' && is_subclass_of(trellis, 'Trellis')
      throw newError('An invalid trellis was passed to the Query constructor.')

    @trellis = trellis 
    @ground = @ground 
    @db = @db 
    @main_table = trellis.get_table_name() 
    @add_source(trellis) 
    if include_links
      current_trellis = trellis 
      loop
        for link of current_trellis.links
          @add_link(link) 

        break unless current_trellis = current_trellis.parent

  add_source: (source, include_primary_key)->
    @sources 
    table_name = source.get_table_name() 
    for property of source.core_properties
      if property.name != source.primary_key || include_primary_key
        @add_field(table_name + '.' + property.field_name)
        

    source.parent_query(this) 

  add_filter: (clause)->
    @filters 

  add_field: (clause)->
    @fields 

  add_join: (clause)->
    @joins 

  add_post: (clause)->
    @post_clauses 

  generate_pager: (offset, limit)->
    if offset == 0
      if limit == 0
        return ''

      else
        return ' () LIMIT $limit'

    else
      if limit == 0
        limit = 18446744073709551615 

      return ' LIMIT $offset, $limit'

  add_link: (property)->
    if is_string(property)
      name = property 
      property = @properties[name] 
      if property
        throw newError(@name + ' does not have a property named ' + name + '.')

    other = @trellises[property.trellis] 
    if other
      throw newError('Could not find reference to property ' + property.name + ' for ' + property.trellis + '.')

    link = {} 
    link.other = other 
    link.property = property 
    @links[property.name] = link 
    if property.type == 'reference'
      @add_field('$property->field_name AS `$property->name`') 

  add_links: (paths)->
    for path of paths
      @add_link(path) 

  add_pager: ->
    @limit = @generate_pager(parseInt(_GET['offset']), parseInt(_GET_['limit'])) 

  paged_sql: (sql)->
    if @limit != ''
      sql += ' ' + @limit
      

    return sql

  remove_field: (table, field_name)->
    if @trellises[table]
      delete @fields[table]
      

  generate_sql: ->
    #global user
    sql = 'SELECT ' 
    sql += implode(', ', @fields) 
    sql += ' FROM ' + @main_table 
    if count(@joins) > 0
      sql += ' ' + implode(' ', @joins) 

    if count(@filters) > 0
      sql += ' WHERE ' + implode(' AND ', @filters) 

    if count(@post_clauses) > 0
      sql += ' ' + implode(' ', @post_clauses) 

    return sql

  run: ->
    result = {} 
    result.objects = [] 
    sql = @generate_sql() 
    sql = str_replace('\r', '\n', sql) 
    paged_sql = @paged_sql(sql) 
    rows = @query_objects(paged_sql) 
    for row of rows
      @process_row(row) 
      result.objects 

    @post_process_result(result) 
    return result.objects

  run_as_service: (return_sql)->
    result = {} 
    result.objects = [] 
    sql = @generate_sql() 
    sql = str_replace('\r', '\n', sql) 
    paged_sql = @paged_sql(sql) 
    @sql = paged_sql 
    rows = @query_objects(paged_sql) 
    for row of rows
      @process_row(row) 
      result.objects 

    @post_process_result(result) 
    if return_sql
      result.sql = @sql
      

    return result

  process_row: (row)->
    # Map field names to bloom property names.
    for property of @properties
      if property.name != property.field_name
        if typeof row[property.field_name] != 'undefined'
          row[property.name] = row[property.field_name] 
          delete row[property.field_name] 

    for item of @trellises
      @translate(row) 

    for source of @sources
      for property of source.properties
        full_name = property.name 
        if row[full_name] != undefined
          row[full_name] = Ground.convert_value(row[full_name], property.type) 

    for name, link of @links
      property = link.property 
      id = row[property.primary_key] 
      other_property = link.get_link_property(property.parent) 
      if other_property == null
        throw newError(property.name + '->' + property.name + ' does not have a reciprocal reference on ' + link.other + '.')

      if property.type == 'list' && other_property.type == 'list'
        # Many to Many
        row[name] = @get_many_to_many_list(id, property, other_property, link.other) 

      else if property.type == 'list'
        # One to Many
        row[name] = @get_one_to_many_list(id, property, other_property, link.other) 

      else
        # One to One
        row[name] = @get_reference_object(row, property, link.other) 

  get_many_to_many_list: (id, property, other_property, other)->
    query = @create_query(other_table, false) 
    join = Link_Trellis.create(other_table.get_primary_property(), property.get_primary_property()) 
    join_sql = join.generate_join(id) 
    query.add_join(join_sql) 
    result = query.run_as_service(true) 
    @sql += '\n' + result.sql 
    return result.objects

  get_one_to_many_list: (id, property, other_property, other_table)->
    query = @create_query(other_table, false) 
    query.add_filter(other_property.query() + ' = ' + id) 
    result = query.run_as_service(true) 
    return result.objects

  get_reference_object: (row, property, other_table)->
    query = @create_query(other_table, false) 
    if typeof row[property.name] != 'undefined'
      throw newError('$property->name is undefined.')

    query.add_filter(other_table.query_primary_key() + ' = ' + row[property.name]) 
    result = query.run_as_service(true) 
    return result.objects[0]

  post_process_result: (result)->
