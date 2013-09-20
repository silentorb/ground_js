/**
 * User: Chris Johnson
 * Date: 9/19/13
 */
/// <reference path="../../../../defs/mysql.d.ts"/>
/// <reference path="../../../../defs/deferred.d.ts"/>
import mysql = require('mysql');
import deferred = require('deferred');

module Ground_JS {
  export class Database {
    settings:{};
    database:string;

    constructor(settings:{}, database:string) {
      this.settings = settings;
      this.database = database;
    }

    drop_all_tables():Promise {
      return this.query('SET foreign_key_checks = 0')
        .then(() => {
          return this.get_tables()
            .map((table) => {
              return this.query('DROP TABLE IF EXISTS ' + table);
            });
        })
        .then(() => {
          this.query('SET foreign_key_checks = 1');
        });
    }

    get_tables():Promise {
      return this.query('SHOW TABLES');
    }

    query(sql:string):Promise {
      var connection, def = deferred();
      connection = mysql.createConnection(this.settings[this.database]);
      connection.connect();
      connection.query(sql, (err, rows, fields) => {
        if (err)
          throw err;

        def.resolve(rows, fields);

        return null;
      });

      return def.promise;
    }
  }
}