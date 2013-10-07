declare module "mysql" {
  export function createConnection(config): Connection;

  interface Connection {
    connect();
    query(sql:string, callback);
    query(sql:string, args:any[], callback);
    end(callback?);
  }
}