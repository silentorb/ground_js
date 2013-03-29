buster = require("buster")
settings = 
  host: "192.168.1.100"
  user: "root"
  password: ""
  database: "ground_test"

db = require('ground_db').create(settings)

fixture = 
  prepare_database: (callback)->
    sql = "
      CREATE TABLE IF NOT EXISTS `objects` (
      `id` int(11) NOT NULL AUTO_INCREMENT,
      `name` varchar(255) DEFAULT NULL,
      `author` int(11) DEFAULT NULL,
      `type` varchar(255) DEFAULT NULL,
      `created` int(11) DEFAULT NULL,
      `modified` int(11) DEFAULT NULL,
      PRIMARY KEY (`id`)
      ) ENGINE=InnoDB DEFAULT CHARSET=latin1 AUTO_INCREMENT=1 ;"

    db.query(sql, callback)
    
  populate_database: (callback)->
    sql = "INSERT INTO objects (name, author, type)
      VALUES ('Bunny', 7, 'food')"
    db.query(sql, callback)

buster.testCase "Database test",
  setUp: (done)->
    db.drop_all_tables(done)

  "test drop_all_tables": (done)->
    db.query 'SHOW TABLES', done((rows)->
      assert.equals(rows.length, 0)
    )

  "test query rows": (done)->
    fixture.prepare_database ->
      fixture.populate_database ->      
        db.query 'SELECT * FROM objects', done((rows)->
          assert.equals(rows.length, 1)
          assert.equals(rows[0].name, 'Bunny')
          assert.equals(rows[0].author, 7)
        )
