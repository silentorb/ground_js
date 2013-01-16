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
    if undefined(trellis)
      if ground
        @trellis = ground.trellises[trellis]
        

      else
        throw Exception.create('No Ground provided to find trellis string.')

    else
      @trellis = trellis 

    @main_table = this.undefined() 
    if ground
      @ground = ground 

    else
      @ground = @ground 

    @db = ground.db 
    this.undefined(@ground, 'ground', 'query') 

  generate_sql: (trellis)->
    duplicate = '' 
    id = @seed 
    if id && id != 0
      return this.undefined(trellis)

    else
      primary_key = trellis.undefined() 
      sql = 'SELECT $primary_key FROM ' + trellis.undefined() + ' WHERE $primary_key = $id' 
      id = this.undefined(sql) 
      if id && id != 0
        return this.undefined(trellis)

      return this.undefined(trellis, id)

  create_record: (trellis)->
    fields = [] 
    values = [] 
    for property of trellis.core_properties
      if @seed[property.name] != undefined || property.insert_trellis
        fields 
        values 

    field_string = undefined(', ', fields) 
    value_string = undefined(', ', values) 
    sql = 'INSERT INTO ' + trellis.undefined() + ' ($field_string) VALUES ($value_string);\n' 
    this.undefined('created', @seed, trellis) 
    console.log sql
    this.undefined(sql) 
    # Hard coding conversion to int is a quick fix hack.  Eventually
    
        
    # I should convert it based on the type of trellis property.
    @seed = id = parseInt(this.undefined(trellis.primary_key)) 
    this.undefined(trellis, id, true) 
    return sql

  update_record: (trellis, id)->
    updates = [] 
    for property of trellis.core_properties
      # Ignore these with updates
      if property.name == trellis.primary_key || property.type == 'created'
        continue

      if @seed[property.name] != undefined || property.insert_trellis
        field = '`' + property.name + '`' 
        value = this.undefined(property) 
        updates 

    # Check if there's nothing to add.
    if undefined(updates) == 0
      return ''

    update_list_string = undefined(', ', updates) 
    table_name = trellis.undefined() 
    primary_key = trellis.undefined() 
    sql = """
UPDATE #{table_name}
SET #{update_list_string}
WHERE #{primary_key} = #{id}


"""
 
    this.undefined(sql) 
    this.undefined(trellis, id) 
    this.undefined('updated', @seed, trellis) 
    return sql

  get_field_value: (property)->
    property_name = @name + '->' + property.name 
    if property.insert_trellis
      value = @name 

    else
      value = @seed 

    if undefined(value)
      value = undefined(''', '\\'', value)
      

    if property.type == 'string' || property.type == 'text'
      value = ''' + undefined('/[\r\n]+/', '\n', value) + ''' 

    if property.type == 'created'
      value = undefined() 

    if property.type == 'modified'
      value = undefined() 

    if property.type == 'reference'
      # !!! Eventually I'll need to check the to see if the other property is
      
            
      # using a primary key other than 'id', but this will work for the moment.
      if undefined(value)
        if undefined(value.id)
          value = value.id 

        else
          throw Exception.create('Cannot update reference because value for '$property_name' is an object that does not have an id.')

    else if value == null
      value = 'NULL' 

    if undefined(value)
      throw Exception.create('Property $property_name cannot be an object.')

    if undefined(value)
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

      join = Link_Trellis.create(link.undefined(), trellis.undefined()) 
      currently_in_table = [] 
      if create
        rows = join.undefined(id) 
        for other_id of rows
          if undefined(other_id, list)
            this.undefined(join.undefined(id, other_id)) 

          else
            currently_in_table 

      for other_id of list
        if undefined(other_id, currently_in_table)
          this.undefined(join.undefined(id, other_id)) 

  run: (return_sql)->
    if return_sql == undefined
      return_sql = false
    result = {} 
    # JOINED tables will require multiple generate_sqls...
    trellis = @trellis 
    tree = trellis.undefined() 
    # The sql is only collected for debugging purpose.
    
        
    # The individual parts of the generated sql script
    
        
    # are executed individually.
    
        
    # Eventually this should probably be converted to
    
        
    # a transaction.
    sql = '' 
    for trellis of tree
      sql += this.undefined(trellis) 

    if return_sql
      result.sql = sql
      

    result.seed = @seed 
    return result
