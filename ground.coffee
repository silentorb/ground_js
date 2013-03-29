MetaHub = require 'metahub'
Meta_Object = MetaHub.Meta_Object
Ground_Database = require 'ground_db'

#Query = require './classes/Query.coffee'
#Trellis = require './classes/Trellis.coffee'
#Database = require './node_modules/ground_db/Ground_Database.coffee'
#Table = require './node_modules/ground_db/Ground_Database.coffee'
#fs = require 'fs'

Property_Type = Meta_Object.subclass 'Property_Type',
  name: ''
  property_class: ''
  field_type: ''
  'default': null
  initialize: (name, info, types)->
    # Transferring parent properties is done before any other assignment
    
        
    # so the MetaHub::extend() can be overridden.
    if info.parent
      parent = types[info.parent] 
      MetaHub.extend(this, parent) 
      @parent = parent 

    else
      @field_type = info.field_type 

    @name = name 
    @property_class = 'Bloom_Property' 
    if info['default']
      this['default'] = info['default']

module.exports = Meta_Object.subclass 'Ground',
  trellises: []
#  map: []
#  queries: []
  property_types: []
  db: ''
#  modules: []
#  initialize: (database)->
#    if database == undefined
#      database = null
#    if database
#      @db = Ground_Database.create() 
#      @connect(database) 
#
#    @load_schema_from_file('./vineyard.json')
#    @listen(this, 'connect.query', 'on_connect_query') 
#    json = fs.readFileSync('./property_types.json', "ascii")
#    property_types = JSON.parse(json)
#    for name, info of property_types
#      type = Property_Type.create(name, info, @property_types)
#      @property_types[name] = type 
#
#  add_module: (name)->
#    module = new name() 
#    @connect(module, 'module', 'ground') 
#    @modules[name] = module 
#
#  on_connect_query: (query)->
#    @listen(query, 'all', 'respond') 
#
#  respond: ->
#    args = func_get_args() 
#    call_user_func_array([this, 'invoke'], args) 
#
#  initialize_trellises: (subset, all)->
#    if all == undefined
#      all = null
#    if all == null
#      all = subset
#      
#
#    for object in subset
#      # Convert a string reference into a direct reference to the actual object
#      if object.parent
#        object.parent = all[object.parent] 
#        object.check_primary_key() 
#
#    for object in subset
#      object.update_core_properties() 
#
#  load_schema_from_file: (schema_file)->
#    json = fs.readFileSync(schema_file, "ascii")
#    if json == false
#      throw new Error('Could not find schema file: ' + schema_file)
#
#    data = JSON.parse(json)
#    if !data || typeof data != 'object'
#      throw new Error('Invalid JSON in file $schema_file.')
#
#    @parse_schema(data) 
#
#  parse_schema: (data)->
#    if data.trellises
#      @load_trellises(data.trellises) 
#
#    if data.tables
#      @load_tables(data.tables) 
#
#  load_schema_from_database: ->
#    # The SQL would be a lot simpler except we are converting
#    
#
#    # ids to name keys.
#    sql = """
#SELECT trellis.id, trellis.name, trellis.plural, trellis.primary_key, parent_trellis.name as parent
#FROM vineyard_trellises trellis
#LEFT JOIN vineyard_trellises parent_trellis ON trellis.parent = parent_trellis.id
#
#"""#
# 
#    rows = @query_objects(sql) 
#    trellises = [] 
#    sql = """#
#SELECT property.name, property.type, property.readonly,
#property.insert_trellis, other_trellis.name as trellis
#FROM vineyard_properties property
#LEFT JOIN vineyard_trellises other_trellis ON property.trellis = other_trellis.id
#WHERE property.trellis = ?

#"""#
# 
#    for row of rows
#      properties = @query_objects(sql, [row.id]) 
#      row.properties = [] 
#      if row.plural
#        delete row.plural
#        
#
#      for property of properties
#        row.properties[property.name] = property 
#        if property.readonly
#          property.readonly = true
#          
#
#        if property.insert_trellis
#          property.insert_trellis = true
#          
#
#      trellis = Trellis.create(row.name, this) 
#      trellis.load_from_object(row) 
#      trellises[row.name] = trellis 
#
#    @trellises = MetaHub.extend(@trellises, trellises) 
#    @initialize_trellises(trellises, @trellises) 
#
#  load_map: (map_file)->
#    json = file_get_contents(map_file) 
#    data = json_decode(json) 
#    if data.map
#      for key, map of data.map
#        trellis = @trellises[key] 
#        if trellis
#          for key, field_name of map.fields
#            property = trellis.all_properties[key] 
#            if property
#              property.field_name = field_name 
#
#  load_tables: (tables)->
#    for key, object of tables
#      table = Table.create(key, this) 
#      table.load_from_schema(object) 
#      @tables[key] = table 
#
#  load_trellises: (trellises)->
#    for key, object of trellises
#      trellis = Trellis.create(key, this) 
#      trellis.load_from_object(object) 
#      if trellis.id
#        trellis.id = count(@trellises) 
#
#      @trellises[key] = trellis 
#
#    @initialize_trellises(@trellises, @trellises)
#
#  create_query: (trellis, include_links)->
#    if include_links == undefined
#      include_links = true
#    if is_string(trellis)
#      if @trellises[trellis]
#        throw Exception.create('Class ' + trellis + ' does not exist')
#
#      trellis = @trellises[trellis] 
#
#    for key, query of @queries
#      if trellis.is_a(key)
#        return new query(trellis, include_links)
#
#    return Query.create(trellis, include_links)
#
#  convert_value: (value, type)->
#    if value == null
#      if type == 'bool'
#        return false
#
#      return null
#
#    switch type
#      when 'int'
#        return parseInt(value)
#        break
#      when 'string', 'text', 'reference'
#        return value
#        break
#      when 'bool'
#        return str_to_bool(value)
#        break
#      when 'double'
#        return parseFloat(value)
#        break
#
#    return null
#
#  prepare_for_serialization: ->
#    result = {} 
#    result.trellises = [] 
#    for key, trellis of @trellises
#      result.trellises[key] = trellis.get_data() 
#
#    return result
#
#  to_json: ->
#    result = @prepare_for_serialization() 
#    return JSON.stringify(result)

# module.exports.import_into = (target)->
#   target.MetaHub = MetaHub
#   target.Meta_Object = Meta_Object
#   target.Ground = module.exports
#   target.Property_Type = Property_Type

module.exports.Database = Ground_Database
