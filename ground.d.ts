/// <reference path="defs/mysql.d.ts" />
/// <reference path="defs/when.d.ts" />
/// <reference path="defs/node.d.ts" />
/// <reference path="defs/linq.d.ts" />
/**
* Created with JetBrains PhpStorm.
* User: Chris Johnson
* Date: 9/18/13
*/
declare module MetaHub {
    function remove(array, item): void;
    function has_properties(obj): boolean;
    function is_array(obj): boolean;
    function size(obj): number;
    function S4(): string;
    function values(source): any[];
    function concat(destination, source): {};
    function extend(destination, source, names?);
    function guid(): string;
    function clone(source, names): {};
    function get_connection(a, b);
    function filter(source, check: (value: any, key?: any, source?: any) => boolean): {};
    function map(source, action): {};
    function map_to_array(source, action): any[];
    class Meta_Object {
        public is_meta_object: boolean;
        private events;
        private internal_connections;
        static connect_objects(first, other, type): boolean;
        static disconnect_objects(first, other): void;
        static has_property(target, name): boolean;
        static invoke_binding(source, owner, name): void;
        public listen(other: Meta_Object, name: string, method: (...args: any[]) => any, options?): void;
        public unlisten(other, name): void;
        public invoke(name: string, ...args: any[]): void;
        public invoke_async(name): void;
        public gather(name);
        public connect(other: Meta_Object, type: string, other_type?: string): void;
        public disconnect(other): void;
        public disconnect_all(type): void;
        public is_listening(other, name): boolean;
        public get_connections(...filters: any[]): any[];
        public get_connection(filter);
        public define_connection_getter(property_name, connection_name): void;
        public define_object(property_name, connection_name): void;
        public optimize_getter(property_name, connection_name): void;
    }
    class Meta_Connection {
        public other: Meta_Object;
        public parent: Meta_Object;
        public type: string;
        constructor(parent, other, type);
    }
}
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
        public query(sql: string, args?: any[]): Promise;
    }
}
declare module Ground {
    class Trellis {
        public plural: string;
        public parent: Trellis;
        public ground: Ground.Core;
        public table: Ground.Table;
        public name: string;
        public primary_key: string;
        public properties: {
            [name: string]: Ground.Property;
        };
        public all_properties: {
            [name: string]: Ground.Property;
        };
        public is_virtual: boolean;
        constructor(name: string, ground: Ground.Core);
        public add_property(name: string, source): Ground.Property;
        public check_primary_key(): void;
        public clone_property(property_name: string, target_trellis: Trellis): void;
        public get_all_links(filter?: (property: Ground.Property) => boolean): {
            [name: string]: Ground.Property;
        };
        public get_all_properties(): {
            [name: string]: Ground.Property;
        };
        public get_core_properties(): Ground.Property[];
        public get_join(main_table: string): string;
        public get_links(): Ground.Property[];
        public get_plural(): string;
        public get_table_name(): string;
        public get_table_query(): string;
        public get_tree(): Trellis[];
        public load_from_object(source: Ground.ITrellis_Source): void;
        public query_primary_key(): string;
        public sanitize_property(property);
        public set_parent(parent: Trellis): void;
    }
}
declare module Ground {
    interface IService_Response {
        objects: any[];
    }
    class Query {
        public ground: Ground.Core;
        public main_table: string;
        public joins: string[];
        public filters: string[];
        public post_clauses: any[];
        public limit: string;
        public trellis: Ground.Trellis;
        public db: Ground.Database;
        public include_links: boolean;
        public fields: string[];
        public base_path: string;
        public arguments: {};
        public expansions: string[];
        static log_queries: boolean;
        private links;
        constructor(trellis: Ground.Trellis, base_path?: string);
        public add_arguments(args): void;
        public add_filter(clause: string, arguments?: any[]): void;
        public add_property_filter(property, value?, like?: boolean): void;
        public add_key_filter(value): void;
        public add_field(clause: string, arguments?): void;
        public add_join(clause: string, arguments?): void;
        public add_property_join(property: Ground.Property, id, reverse?: boolean): void;
        public add_post(clause: string, arguments?): void;
        public add_expansion(clause): void;
        public add_link(property): void;
        public generate_pager(offset?: number, limit?: number): string;
        public generate_sql(properties): string;
        public get_fields_and_joins(properties: {
            [name: string]: Ground.Property;
        }, include_primary_key?: boolean): {
            fields: string[];
            joins: any[];
        };
        public get_many_list(id, property: Ground.Property, relationship: Ground.Relationships): Promise;
        public get_path(...args: string[]): string;
        public get_reference_object(row, property: Ground.Property): Promise;
        public has_expansion(path: string): boolean;
        public process_row(row, authorized_properties?): Promise;
        public run(args?: {}): Promise;
        public run_as_service(arguments?: {}): Promise;
    }
}
declare module Ground {
    class Update {
        private seed;
        private fields;
        public override: boolean;
        public trellis: Ground.Trellis;
        public main_table: string;
        public ground: Ground.Core;
        public db: Ground.Database;
        public is_service: boolean;
        static log_queries: boolean;
        constructor(trellis: Ground.Trellis, seed: Ground.ISeed, ground?: Ground.Core);
        private generate_sql(trellis);
        private create_record(trellis);
        private update_record(trellis, id, key_condition);
        private apply_insert(property, value);
        public is_create_property(property: Ground.Property): boolean;
        private get_field_value(property);
        private is_update_property(property);
        private update_links(trellis, id, create?);
        private update_many_to_many(property, id, create?);
        private update_one_to_many(property, id);
        private update_reference(property, id);
        private update_reference_object(object, property, id);
        public run(): Promise;
    }
}
declare module Ground {
    class Delete {
        public run(trellis: Ground.Trellis, seed: Ground.ISeed): Promise;
    }
}
declare module Ground {
    interface IProperty_Source {
        name?: string;
        type: string;
        insert?: string;
        is_virtual?: boolean;
        is_readonly?: boolean;
        is_private?: boolean;
        property?: string;
        trellis?: string;
    }
    interface ITrellis_Source {
        plural: string;
        parent: string;
        name: string;
        primary_key: string;
        properties: IProperty_Source[];
        is_virtual: boolean;
    }
    interface ISeed {
        _deleted?;
    }
    class Property_Type {
        public name: string;
        public property_class;
        public field_type;
        public default_value;
        public parent: Property_Type;
        public db: Ground.Database;
        constructor(name: string, info, types: Property_Type[]);
        public get_field_type();
    }
    class Core extends MetaHub.Meta_Object {
        public trellises: Ground.Trellis[];
        public tables: Ground.Table[];
        public views: any[];
        public property_types: Property_Type[];
        public db: Ground.Database;
        public expansions: any[];
        constructor(config, db_name: string);
        public add_trellis(name: string, source: ITrellis_Source, initialize_parent?: boolean): Ground.Trellis;
        public convert_value(value, type);
        public create_query(trellis_name: string, base_path?: string): Ground.Query;
        public delete_object(trellis: Ground.Trellis, seed: ISeed): Promise;
        public initialize_trellises(subset: Ground.Trellis[], all?): void;
        public insert_object(trellis, seed?: ISeed): Promise;
        static is_private(property: Ground.Property): boolean;
        static is_private_or_readonly(property: Ground.Property): boolean;
        public update_object(trellis, seed?: ISeed, as_service?: boolean): Promise;
        static load_json_from_file(filename: string);
        public load_property_types(filename: string): void;
        public load_schema_from_file(filename: string): void;
        public load_tables(tables: any[]): void;
        public load_trellises(trellises: ITrellis_Source[]): void;
        private parse_schema(data);
        static remove_fields(object, trellis: Ground.Trellis, filter);
        public sanitize_trellis_argument(trellis);
        static to_bool(input): boolean;
    }
}
declare module Ground {
    interface IField {
        relationship: string;
        name: string;
        share: string;
    }
    class Table {
        public name: string;
        public properties: any[];
        public indexes: any[];
        public ground: Ground.Core;
        public db_name: string;
        public trellis: Ground.Trellis;
        public primary_keys: any[];
        public query: string;
        constructor(name: string, ground: Ground.Core);
        public connect_trellis(trellis: Ground.Trellis): void;
        static create_from_trellis(trellis: Ground.Trellis, ground?: Ground.Core): Table;
        static create_sql_from_array(table_name: string, source: any[], primary_keys?: any[], indexes?: any[]): string;
        public create_sql_from_trellis(trellis: Ground.Trellis): string;
        static format_value(value);
        static generate_index_sql(name: string, index): string;
        public load_from_schema(source): void;
    }
}
declare module Ground {
    class Link_Trellis {
        public table_name: string;
        public property: Ground.Property;
        public args;
        public first_property: Ground.Property;
        public second_property: Ground.Property;
        public id_suffix: string;
        constructor(property: Ground.Property);
        public generate_join(id, reverse?: boolean): string;
        public get_arguments(property): {
            '%first_id': any;
            '%second_id': any;
            '%back_id': any;
            '%forward_id': any;
        };
        static populate_sql(sql: string, args): string;
    }
}
declare module Ground {
    enum Relationships {
        one_to_one,
        one_to_many,
        many_to_many,
    }
    class Property {
        public name: string;
        public parent: Ground.Trellis;
        public type: string;
        public is_readonly: boolean;
        public insert: string;
        public other_property: string;
        public default;
        public other_trellis: Ground.Trellis;
        public other_trellis_name: string;
        public is_private: boolean;
        public is_virtual: boolean;
        constructor(name: string, source: Ground.IProperty_Source, trellis: Ground.Trellis);
        public get_data(): Ground.IProperty_Source;
        public get_field_name(): string;
        public get_field_override(create_if_missing?: boolean): Ground.IField;
        public get_field_type();
        static get_field_value_sync(value);
        public get_field_value(value, as_service?: boolean): Promise;
        public get_other_id(entity);
        public get_other_property(create_if_none?: boolean): Property;
        public get_property_type(): Ground.Property_Type;
        public get_referenced_trellis(): Ground.Trellis;
        public get_relationship(): Relationships;
        public query(): string;
    }
}
declare module Ground {
    interface Query_Request {
        trellis: string;
    }
    interface Update_Request {
        objects: any[];
    }
    class Irrigation {
        public ground: Ground.Core;
        constructor(ground: Ground.Core);
        public query(request: Query_Request): Promise;
        public update(request: Update_Request): Promise;
    }
}
