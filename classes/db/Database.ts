/**
 * User: Chris Johnson
 * Date: 9/19/13
 */
/// <reference path="../../../../defs/mysql.d.ts"/>
import mysql = require('mysql');

module Ground_JS {
  export class Database {
    settings:{};
    database:string;

    constructor(settings:{}, database:string) {
      this.settings = settings;
      this.database = database;
    }

    query(sql, success) {
      var connection;
      connection = mysql.createConnection(this.settings[this.database]);
      connection.connect();
      connection.query(sql, (err, rows, fields) => {
        if (err)
          throw err;

        if (typeof success === 'function')
          return success(rows, fields);

        return null;
      });

      return connection.end();
    }
  }
}