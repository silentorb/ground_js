Trellis_Test = Ground_Test_Fixtures.subclass 'Trellis_Test',
  setUp: ->
    @ground = Ground.create() 
    @trellis = @trellises['vineyard_trellis'] 

  test_get_parent_tree: ->
    this.fixture_load_schemas() 
    tree = this.get_tree() 
    this.assertEquals(2, count(tree)) 

  test_property_types: ->
    property = @properties['name'] 
    property_type = property.get_property_type() 
    this.assertEquals('string', property_type.name) 
    this.assertSame('', property_type.default) 
    this.assertSame('', property.get_default()) 

  test_plural: ->
    this.assertEquals('vineyard_trellises', this.get_table_name()) 

  test_create_object: ->
    object = this.create_object() 
    this.assertSame('', object.name) 
    this.assertSame(null, object.id) 
    this.assertEquals(count(@properties), count(object)) 
