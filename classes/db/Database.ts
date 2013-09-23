/**
 * User: Chris Johnson
 * Date: 9/19/13
 */
/// <reference path="../require.ts"/>
/// <reference path="../../defs/deferred.d.ts"/>
/// <reference path="../../defs/mysql.d.ts"/>

var deferred = require('deferred');

module Ground {
  export class Database {
    settings:{};
    database:string;

    constructor(settings:{}, database:string) {
      this.settings = settings;
      this.database = database;
    }

    drop_all_tables():Promise {
      return this.query('SET foreign_key_checks = 0')
        .then(this.get_tables()
            .map((table) => {
              console.log('table', table);
              return this.query('DROP TABLE IF EXISTS ' + table);
            }))
        .then(this.query('SET foreign_key_checks = 1'));
    }

    get_tables():Promise {
      var def = new deferred();
      console.log('a')
      this.query('SHOW TABLES')
        .then((tables) => def.resolve(tables.map((row) => {
          console.log('test')
          for (var i in row)
            return row[i];

          return null;
        })));

      return def.promise;
    }

    query(sql:string):any {
      var connection, def = deferred();
      var mysql = require('mysql')
      connection = mysql.createConnection(this.settings[this.database]);
      connection.connect();
      connection.query(sql, (err, rows, fields) => {
        if (err)
          throw err;

        console.log(sql, rows)
        def.resolve(rows, fields);

        return null;
      });

      return def.promise;
    }
  }
}