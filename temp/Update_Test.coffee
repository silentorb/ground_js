Update_Test = Ground_Test_Fixtures.subclass 'Update_Test',
  setUp: ->
    @ground = Ground.create('ground_test') 
    @trellis = @trellises['vineyard_trellis'] 
    @object = this.create_object() 

  test_insert: ->
    update = Update.create(@trellis, @object, @ground) 
    result = update.run(true) 
    this.assertSame(result.seed, @object) 
    this.assertSame(1, result.id) 

  test_update_object_reference: ->
    this.fixture_populate_database() 
    this.insert_object('character_item', 
      'name': 'axe'
      'owner': @ninja_bob
) 
    query = this.create_query('character_item') 
    result = query.run_as_service() 
    objects = result.objects 
    this.assertEquals(1, objects[1].id[1]) 
