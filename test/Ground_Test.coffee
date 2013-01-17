require('../Ground').import_into(module)
Fixtures = require './Ground_Test_Fixtures.coffee'

Ground_Test = Fixtures.subclass 'Ground_Test',
  setUp: ->
    @ground = Ground.create() 

  test_property_types: ->
    @ok(count(@property_types) > 0, 'Property types were loaded.')
    parent_type = {} 
    parent_type.field_type = 'INT(4)' 
    types = [] 
    types['parent_type'] = Property_Type.create('parent_type', parent_type, types) 
    child_type = {} 
    child_type.parent = 'parent_type' 
    child_type = Property_Type.create('parent_type', child_type, types)
    @equal(child_type.field_type, 'INT(4)', 'testing')
    @done()
#    for type of @property_types
#      this.assertEquals(1, type.field_type.match(/^[A-Z_0-9]+\s*(?:\(\d+\))?[\w\s]*$/), 'Field Type '$type->field_type' is valid')

module.exports = Ground_Test.get_tests Ground_Test
