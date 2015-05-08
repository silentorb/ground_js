/// <reference path="../defs/mysql.d.ts" />
/// <reference path="../../vineyard-metahub/metahub.d.ts" />
/// <reference path="landscape.d.ts" />
/// <reference path="mining.d.ts" />
declare var when: any;
declare var mysql: any;
declare var sequence: any;
declare class Database implements mining.IQueryable {
    settings: any;
    log_queries: boolean;
    private database;
    private pool;
    private script_pool;
    private active;
    private active_query_count;
    private on_final_query;
    constructor(settings: any, database: string);
    add_table_to_database(table: landscape.Table, schema: landscape.Schema): Promise;
    add_non_trellis_tables_to_database(tables: landscape.Table[], schema: landscape.Schema): Promise;
    start(): void;
    close(immediate?: boolean): Promise;
    private wait_for_remaining_queries();
    private close_all_pools();
    private close_pool(pool, name);
    drop_all_tables(): Promise;
    get_tables(): Promise;
    is_active(): boolean;
    query(sql: string, args?: any[], pool?: any): Promise;
    query_single(sql: string, args?: any[]): Promise;
    run_script(sql: string, args?: any[]): Promise;
}
