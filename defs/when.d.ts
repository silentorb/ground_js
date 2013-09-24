
interface Deferred {
  promise: Promise;
  resolve(...args:any[]);
}

interface Promise {
  then(...args:any[]):Promise;
  map(...args:any[]):Promise;
}
declare module "when" {

  function defer(): Deferred;
}