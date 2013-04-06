Link_Trellis = Meta_Object.subclass 'Link_Trellis',
  table_name: ''
  first_property: ''
  second_property: ''
  id_suffix: ''
  initialize: (first_property, second_property, ground)->
    @ground = ground 
    @ground = ground.db
    other_table = second_property.get_table_name() 
    temp = [other_table, first_property.get_table_name()] 
    sort(temp) 
    @table_name = implode('_', temp) 
    @first_property = first_property 
    @second_property = second_property 

  get_cross_table_name: ->

  generate_join: (id)->
    if id
      id = this.query()
      

    table_name = @table_name 
    first_key = @name + @id_suffix 
    second_key = @name + @id_suffix 
    sql = 'JOIN $table_name ON $table_name.$first_key = ' + this.query() + ' AND $table_name.$second_key = $id\n' 
    return sql

  query_rows: (id)->
    if id
      id = this.query()
      

    table_name = @table_name 
    first_key = @name + @id_suffix 
    second_key = @name + @id_suffix 
    sql = 'SELECT $table_name.$first_key FROM $table_name WHERE $table_name.$second_key = $id\n' 
    return this.query_values(sql)

  delete_row: (first_id, second_id)->
    table_name = @table_name 
    first_key = @name + @id_suffix 
    second_key = @name + @id_suffix 
    sql = 'DELETE FROM $table_name WHERE $table_name.$first_key = $second_id' + ' AND $table_name.$second_key = $first_id\n' 
    return sql

  generate_insert: (first_id, second_id)->
    table_name = @table_name 
    first_key = @name + @id_suffix 
    second_key = @name + @id_suffix 
    sql = 'INSERT INTO $table_name ($first_key, $second_key) VALUES ($second_id, $first_id)\n;' 
    return sql
