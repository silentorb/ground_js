/**
 * User: Chris Johnson
 * Date: 9/19/13
 */
/// <reference path="../references.ts"/>
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

    create_table(trellis:Trellis):Promise {
      if (!trellis)
        throw new Error('Empty object was passed to create_table().');

      var table = Table.create_from_trellis(trellis);
      var sql = table.create_sql_from_trellis(trellis);
      return this.query(sql).then(()=>table);
    }

    drop_all_tables():Promise {
      return this.query('SET foreign_key_checks = 0')
        .then(this.get_tables()
          .map((table) => {
            console.log('table', table);
            return this.query('DROP TABLE IF EXISTS ' + table);
          }))
        .then(()=> this.query('SET foreign_key_checks = 1'));
    }

    get_tables():Promise {
      return this.query('SHOW TABLES')
        .map((row) => {
          for (var i in row)
            return row[i];

          return null;
        });
    }

    query(sql:string):any {
      var connection, def = deferred();
      var mysql = require('mysql')
      connection = mysql.createConnection(this.settings[this.database]);
      connection.connect();
      connection.query(sql, (err, rows, fields) => {
        if (err) {
          console.log(sql);
          throw err;
        }
//        console.log(sql, rows)
        def.resolve(rows, fields);

        return null;
      });
      connection.end();

      return def.promise;
    }
  }
}