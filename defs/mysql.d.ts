declare module "mysql" {
  export function createConnection(config): Connection;
  export function createPool(config)

  interface Connection {
    connect();
    query(sql:string, callback);
    query(sql:string, args:any[], callback);
    end(callback?);
  }
}