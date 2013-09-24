/// <reference path="../references.d.ts" />
/// <reference path="../../defs/deferred.d.ts" />
/// <reference path="../../defs/mysql.d.ts" />
declare var deferred;
declare module Ground {
    class Database {
        public settings: {};
        public database: string;
        constructor(settings: {}, database: string);
        public drop_all_tables(): Promise;
        public get_tables(): Promise;
        public create_table(trellis: Ground.Trellis): Promise;
        public z;
        public query(sql: string): any;
    }
}
