Query_Test = Ground_Test_Fixtures.subclass 'Query_Test',
  setUp: ->
    this.fixture_populate_database() 

  test_select: ->
    query = this.create_query(@trellises['warrior']) 
    result = query.run_as_service() 
    objects = result.objects 
    this.assertEquals(1, count(objects)) 
    this.assertEquals('Bob', objects[0].name[0]) 
    query = this.create_query(@trellises['character_item']) 
    result = query.run_as_service() 
    objects = result.objects 
    this.assertEquals(1, objects[0].id[0]) 
