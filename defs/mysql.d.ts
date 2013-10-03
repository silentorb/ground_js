declare module "mysql" {
  export function createConnection(config): Connection;

  interface Connection {
    connect();
    query(sql:string, callback);
    end(callback?);
  }
}