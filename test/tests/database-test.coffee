buster = require("buster")
db = require('../../query.coffee')
db.database = 'guest'

buster.testCase "Database test",
  "test it": (done)->
    db.query 'SELECT * FROM messages', done((rows)->
      assert.equals(rows.length, 1)
#      console.log rows
    )
