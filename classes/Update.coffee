Update = Meta_Object.subclass 'Update',
  seed: ''
  fields: []
  overwrite: true
  trellis: ''
  main_table: 'node'
  ground: ''
  db: ''
  initialize: (trellis, seed, ground)->
    if ground == undefined
      ground = null
    @seed = seed 
    if is_string(trellis)
      if ground
        @trellis = ground.trellises[trellis]
        

      else
        throw Exception.create('No Ground provided to find trellis string.')

    else
      @trellis = trellis 

    @main_table = this.get_table_name() 
    if ground
      @ground = ground 

    else
      @ground = @ground 

    @db = ground.db 
    this.connect(@ground, 'ground', 'query') 

  generate_sql: (trellis)->
    duplicate = '' 
    id = @seed 
    if id && id != 0
      return this.create_record(trellis)

    else
      primary_key = trellis.query_primary_key() 
      sql = 'SELECT $primary_key FROM ' + trellis.get_table_name() + ' WHERE $primary_key = $id' 
      id = this.query_value(sql) 
      if id && id != 0
        return this.create_record(trellis)

      return this.update_record(trellis, id)

  create_record: (trellis)->
    fields = [] 
    values = [] 
    for property of trellis.core_properties
      if @seed[property.name] != undefined || property.insert_trellis
        fields 
        values 

    field_string = implode(', ', fields) 
    value_string = implode(', ', values) 
    sql = 'INSERT INTO ' + trellis.get_table_name() + ' ($field_string) VALUES ($value_string);\n' 
    this.invoke('created', @seed, trellis) 
    console.log sql
    this.query(sql) 
    # Hard coding conversion to int is a quick fix hack.  Eventually
    
        
    # I should convert it based on the type of trellis property.
    @seed = id = parseInt(this.last_insert_id(trellis.primary_key)) 
    this.update_links(trellis, id, true) 
    return sql

  update_record: (trellis, id)->
    updates = [] 
    for property of trellis.core_properties
      # Ignore these with updates
      if property.name == trellis.primary_key || property.type == 'created'
        continue

      if @seed[property.name] != undefined || property.insert_trellis
        field = '`' + property.name + '`' 
        value = this.get_field_value(property) 
        updates 

    # Check if there's nothing to add.
    if count(updates) == 0
      return ''

    update_list_string = implode(', ', updates) 
    table_name = trellis.get_table_name() 
    primary_key = trellis.query_primary_key() 
    sql = """
UPDATE #{table_name}
SET #{update_list_string}
WHERE #{primary_key} = #{id}


"""
 
    this.query(sql) 
    this.update_links(trellis, id) 
    this.invoke('updated', @seed, trellis) 
    return sql

  get_field_value: (property)->
    property_name = @name + '->' + property.name 
    if property.insert_trellis
      value = @name 

    else
      value = @seed 

    if is_string(value)
      value = str_replace(''', '\\'', value)
      

    if property.type == 'string' || property.type == 'text'
      value = ''' + preg_replace("/ [  \  r  \  n  ]  +  /", '\n', value) + ''' 

    if property.type == 'created'
      value = time() 

    if property.type == 'modified'
      value = time() 

    if property.type == 'reference'
      # !!! Eventually I'll need to check the to see if the other property is
      
            
      # using a primary key other than 'id', but this will work for the moment.
      if is_object(value)
        if isset(value.id)
          value = value.id 

        else
          throw Exception.create('Cannot update reference because value for '$property_name' is an object that does not have an id.')

    else if value == null
      value = 'NULL' 

    if is_object(value)
      throw Exception.create('Property $property_name cannot be an object.')

    if is_array(value)
      throw Exception.create('Property $property_name cannot be an array.')

    return value

  update_links: (trellis, id, create)->
    if create == undefined
      create = false
    for link of trellis.links
      if link.type == 'reference'
        continue

      continue
      list = @seed 
      if list
        continue

      join = Link_Trellis.create(link.get_primary_property(), trellis.get_primary_property()) 
      currently_in_table = [] 
      if create
        rows = join.query_rows(id) 
        for other_id of rows
          if in_array(other_id, list)
            this.query(join.delete_row(id, other_id)) 

          else
            currently_in_table 

      for other_id of list
        if in_array(other_id, currently_in_table)
          this.query(join.generate_insert(id, other_id)) 

  run: (return_sql)->
    if return_sql == undefined
      return_sql = false
    result = {} 
    # JOINED tables will require multiple generate_sqls...
    trellis = @trellis 
    tree = trellis.get_tree() 
    # The sql is only collected for debugging purpose.
    
        
    # The individual parts of the generated sql script
    
        
    # are executed individually.
    
        
    # Eventually this should probably be converted to
    
        
    # a transaction.
    sql = '' 
    for trellis of tree
      sql += this.generate_sql(trellis) 

    if return_sql
      result.sql = sql
      

    result.seed = @seed 
    return result
