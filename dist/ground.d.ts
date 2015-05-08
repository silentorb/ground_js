/// <reference path="../../vineyard-metahub/metahub.d.ts" />
/// <reference path="db.d.ts" />
/// <reference path="../defs/node.d.ts" />
/// <reference path="landscape.d.ts" />
/// <reference path="mining.d.ts" />
declare var uuid: any;
declare module Ground {
    interface IUser {
        id: any;
    }
    class Update implements IUpdate {
        seed: ISeed;
        private fields;
        override: boolean;
        trellis: landscape.Trellis;
        main_table: string;
        ground: Core;
        db: Database;
        user: IUser;
        log_queries: boolean;
        run_stack: any;
        constructor(trellis: landscape.Trellis, seed: ISeed, ground: Core);
        get_access_name(): string;
        private generate_sql(trellis);
        private update_embedded_seed(property, value);
        private update_embedded_seeds(core_properties);
        private create_record(trellis);
        private update_record(trellis, id, key_condition);
        private apply_insert(property, value);
        is_create_property(property: landscape.Property): boolean;
        private get_field_value(property, seed);
        private is_update_property(property);
        private update_links(trellis, id, create?);
        private update_many_to_many(property, create?);
        private update_one_to_many(property);
        private update_reference(property, id);
        private update_reference_object(other, property);
        run(): Promise;
    }
}
declare module Ground {
    class Delete implements IUpdate {
        ground: Core;
        trellis: landscape.Trellis;
        seed: any;
        max_depth: number;
        constructor(ground: Core, trellis: landscape.Trellis, seed: ISeed);
        get_access_name(): string;
        private delete_child(link, id, depth?);
        private delete_children(trellis, id, depth?);
        delete_record(trellis: landscape.Trellis, seed: any): Promise;
        private get_child_links(trellis);
        run(depth?: number): Promise;
        private run_delete(trellis, seed, depth?);
    }
}
declare module Ground {
    var path_to_array: typeof mining.path_to_array;
    interface ISeed {
        _deleted?: any;
        _deleted_?: any;
        _removed_?: any;
        __deleted__?: any;
        __removed__?: any;
    }
    interface IUpdate {
        run: () => Promise;
        get_access_name(): string;
    }
    class Core extends MetaHub.Meta_Object {
        schema: landscape.Schema;
        db: Database;
        log_queries: boolean;
        log_updates: boolean;
        hub: any;
        query_schema: any;
        update_schema: any;
        miner: mining.Miner;
        constructor(config: any, db_name: string);
        private static load_relative_json_file(path);
        get_identity(trellis: string, seed: any): any;
        get_trellis(trellis: any): landscape.Trellis;
        private create_remaining_tables();
        private create_missing_table_links();
        create_query(trellis_name: string): mining.Query_Builder;
        create_update(trellis: any, seed?: ISeed, user?: IUser): IUpdate;
        delete_object(trellis: landscape.Trellis, seed: ISeed): Promise;
        insert_object(trellis: any, seed?: ISeed, user?: IUser, as_service?: boolean): Promise;
        static is_private(property: landscape.Property): boolean;
        static is_private_or_readonly(property: landscape.Property): boolean;
        update_object(trellis: any, seed?: ISeed, user?: IUser, as_service?: boolean): Promise;
        static load_json_from_file(filename: string): any;
        load_schema_from_file(filename: string): void;
        load_tables(tables: any[]): void;
        static remove_fields(object: any, trellis: landscape.Trellis, filter: any): any;
        sanitize_trellis_argument(trellis: any): landscape.Trellis;
        stop(): void;
        export_schema(): landscape.ISchema_Source;
        static perspective(seed: any, trellis: landscape.Trellis, property: landscape.Property): any;
        create_table(trellis: landscape.Trellis): Promise;
        create_trellis_tables(trellises: {
            [key: string]: landscape.Trellis;
        }): Promise;
        assure_properties(trellis: landscape.Trellis, seed: any, required_properties: string[]): Promise;
    }
}
