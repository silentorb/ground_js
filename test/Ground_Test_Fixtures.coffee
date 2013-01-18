require('../Ground').import_into(global)

module.exports = MetaHub.Meta_Object.subclass 'Ground_Test_Fixtures',
  modules: []
  fixture_load_schemas: ->
    @ground = Ground.create('ground_test') 
    for module of @modules
      @add_module(module) 

    path = drupal_get_path('module', 'ground_php') 
    @load_schema_from_file(path + '/test/test-trellises.json') 
    @assertArrayHasKey('warrior', @trellises) 
    @trellis = @trellises['warrior'] 

  fixture_populate_database: ->
    @fixture_load_schemas() 
    db = @db 
    db.drop_all_tables() 
    db.create_tables(@trellises) 
    @ninja_bob = @insert_object 'warrior',
      'name': 'Bob'
      'race': 'legendary'
      'age': 31

    @assertSame(1, @id) 
    @insert_object 'character_item',
      'name': 'sword'
      'owner': @id

  insert_object: (trellis_name, data)->
    trellis = @trellises[trellis_name] 
    @assertArrayHasKey(trellis_name, @trellises) 
    object = trellis.create_object() 
    MetaHub.extend(object, data) 
    update = Update.create(trellis, object, @ground) 
    result = update.run() 
    return object

wrap_test_function = (method, meta_object)->
  return (test)->
    if !test.is_meta_object
      MetaHub.extend(test, meta_object.properties)
      MetaHub.extend(test, meta_object.methods)
    if test.setUp
      test.setUp()
    method.apply(test)

module.exports.get_tests = (meta_object)->
  result = {}
  for name, method of meta_object.methods
    if name.match(/test/)
      result[name] = wrap_test_function method, meta_object
  result
