/// <reference path="../references.d.ts" />
/// <reference path="../../defs/mysql.d.ts" />
/// <reference path="../../defs/when.d.ts" />
declare var when;
declare module Ground {
    class Database {
        public settings: {};
        public database: string;
        constructor(settings: {}, database: string);
        public create_table(trellis: Ground.Trellis): Promise;
        public create_tables(trellises: Ground.Trellis[]): Promise;
        public drop_all_tables(): Promise;
        public get_tables(): Promise;
        public query(sql: string): Promise;
    }
}
