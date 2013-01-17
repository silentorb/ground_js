require('../Ground').import_into(global)

module.exports = MetaHub.Meta_Object.subclass 'Ground_Test_Fixtures',
  modules: []
  fixture_load_schemas: ->
    @ground = Ground.create('ground_test') 
    for module of @modules
      this.add_module(module) 

    path = drupal_get_path('module', 'ground_php') 
    this.load_schema_from_file(path + '/test/test-trellises.json') 
    this.assertArrayHasKey('warrior', @trellises) 
    @trellis = @trellises['warrior'] 

  fixture_populate_database: ->
    this.fixture_load_schemas() 
    db = @db 
    db.drop_all_tables() 
    db.create_tables(@trellises) 
    @ninja_bob = this.insert_object 'warrior',
      'name': 'Bob'
      'race': 'legendary'
      'age': 31

    this.assertSame(1, @id) 
    this.insert_object 'character_item',
      'name': 'sword'
      'owner': @id

  insert_object: (trellis_name, data)->
    trellis = @trellises[trellis_name] 
    this.assertArrayHasKey(trellis_name, @trellises) 
    object = trellis.create_object() 
    MetaHub.extend(object, data) 
    update = Update.create(trellis, object, @ground) 
    result = update.run() 
    return object

module.exports.get_tests = (meta_object)->
  for name, method of meta_object.methods
    result = {}
    if name == 'setUp'
      result[name] = method
    if name.match(/test/)
      console.log name
      result[name] = (test)->
        console.log 'hello'
        MetaHub.extend(test, meta_object.properties)
        MetaHub.extend(test, meta_object.methods)
        test[name]()
