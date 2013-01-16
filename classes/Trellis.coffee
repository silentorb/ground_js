Bloom_Property = Meta_Object.subclass 'Bloom_Property',
  name: ''
  parent: ''
  type: ''
  trellis: ''
  readonly: false
  field_name: ''
  insert_trellis: ''
  initialize: (name, source, parent)->
    names = source 
    for key, item of names
      if this[key] != undefined
        this = source 

    @name = name 
    @field_name = name 
    #
    

    #    if ($this->type == 'reference') {
    

    #      $this->field_name = $name . '_' . $parent->primary_key;
    

    #    }
    

    #    else {
    

    #    }
    @parent = parent 

  get_data: ->
    result = {} 
    #    $result->name = $this->name;
    result.type = @type 
    if @trellis
      result.trellis = @trellis
      

    if @readonly
      result.readonly = @readonly
      

    if @insert_trellis
      result.insert_trellis = @insert_trellis
      

    return result

  get_field_type: ->
    property_type = this.get_property_type() 
    if property_type
      return property_type.field_type

    return null

  get_default: ->
    type = this.get_property_type() 
    return type.default

  get_property_type: ->
    types = @property_types 
    if array_key_exists(@type, types)
      return types[@type]

    return null

  query: ->
    return this.get_table_name() + '.' + @name
 Trellis = Meta_Object.subclass 'Trellis',
  plural: ''
  parent: ''
  ground: ''
  table: ''
  primary_key: 'id'
  # Properties that are specific to this trellis and not inherited from a parent trellis
  properties: []
  # All properties that aren't connections
  core_properties: []
  # Absolutely every property
  all_properties: []
  links: []
  initialize: (name, ground)->
    @ground = ground 
    @name = name 
    #    $this->update_core_properties();
    
    

  check_primary_key: ->
    if @properties[@primary_key] && @parent
      property = @properties[@primary_key] 
      @properties[@primary_key] = Bloom_Property.create(@primary_key, property, this) 

  create_object: ->
    result = {} 
    for name, property of @properties
      # Primary keys should be null, not the default value.
      
            
      # This informs both ground and any SQL inserts that the primary key
      
            
      # is not set and still needs to be assigned a value.
      if name == @primary_key
        result = null 

      else
        result = property.get_default() 

    return result

  get_data: ->
    result = {} 
    #    $result->name = $this->name;
    if @plural
      result.plural = @plural
      

    if @parent
      result.parent = @name
      

    if @primary_key != 'id'
      result.primary_key = @primary_key
      

    result.properties = [] 
    for property of @properties
      result.properties[property.name] = property.get_data() 

    return result

  get_link_property: (other_table)->
    for link of @links
      if link.trellis == other_table.name
        return link

    return null

  get_object_id: (object)->
    return object

  get_plural: ->
    if @plural
      return @plural

    return @name + 's'

  get_primary_property: ->
    return @all_properties[@primary_key]

  get_table_name: ->
    if @table
      return @name

    if @plural
      return @plural

    return @name + 's'

  get_tree: ->
    trellis = this 
    tree = [] 
    loop
      tree.unshift(trellis) 
      break unless trellis = trellis.parent

    return tree

  is_a: (name)->
    trellis = this 
    loop
      if trellis.name == name
        return true

      break unless trellis = trellis.parent

    return false

  load_from_database: (table_name)->

  load_from_object: (source)->
    names = source 
    for name, item of names
      if name != 'name' && name != 'properties' && this[name] != undefined && source != null
        this = source 

    for key, property of source.properties
      @properties[key] = Bloom_Property.create(key, property, this) 

  parent_query: (query)->
    if @parent
      parent = @parent 
      parent_table = parent.get_table_name() 
      query.add_join('JOIN ' + parent.get_table_name() + ' ON ' + parent_table + '.' + parent.primary_key + ' = ' + query.main_table + '.' + @primary_key) 
      query.add_source(parent, false) 
      parent.parent_query(query) 

  query_primary_key: ->
    return this.get_table_name() + '.' + @primary_key

  query_property: (property)->
    return this.get_table_name() + '.' + property

  update_core_properties: ->
    @core_properties = [] 
    for property of @properties
      if property.type != 'list'
        @core_properties 

      if property.type == 'reference' || property.type == 'list'
        @links 
        property.other = @trellises[property.trellis] 

    if @parent
      @all_properties = MetaHub.extend(@all_properties, @properties) 

    else
      @all_properties = @properties 
