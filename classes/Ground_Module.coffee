Ground_Module = Meta_Object.subclass 'Ground_Module',
  initialize: ->
    this.listen(this, 'connect.ground', 'initialize') 

  initialize: (ground)->
    @ground = ground 
