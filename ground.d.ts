
/// <reference path="../vineyard-metahub/metahub.d.ts" />

declare var when: any;
declare var mysql: any;
declare var sequence: any;
declare module Ground {
    class Database {
        public settings: any;
        public log_queries: boolean;
        private database;
        private pool;
        private script_pool;
        private active;
        private active_query_count;
        private on_final_query;
        constructor(settings: any, database: string);
        public add_table_to_database(table: Table, ground: Core): Promise;
        public add_non_trellis_tables_to_database(tables: Table[], ground: Core): Promise;
        public start(): void;
        public close(immediate?: boolean): Promise;
        private wait_for_remaining_queries();
        private close_all_pools();
        private close_pool(pool, name);
        public create_table(trellis: landscape.Trellis): Promise;
        public create_trellis_tables(trellises: {
            [key: string]: landscape.Trellis;
        }): Promise;
        public drop_all_tables(): Promise;
        public get_tables(): Promise;
        public is_active(): boolean;
        public query(sql: string, args?: any[], pool?: any): Promise;
        public query_single(sql: string, args?: any[]): Promise;
        public run_script(sql: string, args?: any[]): Promise;
    }
}
declare module Ground {
    interface IField {
        relationship?: string;
        name: string;
        share?: string;
        other_table?: string;
        other_field?: string;
        sql?: any;
    }
    interface Index {
        name: string;
        fields: string[];
        is_unique?: boolean;
    }
    enum Link_Field_Type {
        identity = 0,
        reference = 1,
    }
    class Link_Field {
        public name: string;
        public parent: Table;
        public other_table: Table;
        public type: Link_Field_Type;
        public other_link: Link_Field;
        public field: IField;
        public property: landscape.Property;
        constructor(name: string, parent: Table, other_table: Table, type: Link_Field_Type);
    }
    class Table {
        public name: string;
        public properties: {};
        public indexes: any[];
        public ground: Core;
        public db_name: string;
        public trellis: landscape.Trellis;
        public primary_keys: any[];
        public query: string;
        public links: {};
        constructor(name: string, ground: Core);
        public connect_trellis(trellis: landscape.Trellis): void;
        static create_from_trellis(trellis: landscape.Trellis, ground?: Core): Table;
        static get_other_table(property: landscape.Property): Table;
        static get_other_table_name(property: landscape.Property): string;
        public create_link(property: landscape.Property): void;
        public create_sql(ground: Core): string;
        static create_sql_from_array(table_name: string, source: any[], primary_keys?: any[], indexes?: any[]): string;
        public create_sql_from_trellis(trellis: landscape.Trellis): string;
        private get_primary_keys(trellis);
        static format_value(value: any): any;
        static generate_index_sql(index: Index): string;
        public load_from_schema(source: any): void;
    }
}
declare module landscape {
    interface ISchema {
        trellises: {
            [key: string]: Trellis;
        };
        tables: Ground.Table[];
        property_types: Property_Type[];
        convert_value(value: any, type: any): any;
        custom_tables: Ground.Table[];
    }
}
declare module landscape {
    enum Relationships {
        none = 0,
        one_to_one = 1,
        one_to_many = 2,
        many_to_many = 3,
    }
    class Property {
        public name: string;
        public parent: Trellis;
        public type: string;
        public insert: string;
        public other_property: string;
        public "default": any;
        public other_trellis: Trellis;
        public other_trellis_name: string;
        public is_private: boolean;
        public is_parent: boolean;
        public is_readonly: boolean;
        public is_virtual: boolean;
        public is_composite_sub: boolean;
        public is_unique: boolean;
        public composite_properties: any[];
        public access: string;
        public allow_null: boolean;
        constructor(name: string, trellis: Trellis);
        public fullname(): string;
        public get_allow_null(): boolean;
        public get_composite(): Property[];
        public get_default(): any;
        public get_field_name(): string;
        public get_field_override(create_if_missing?: boolean): Ground.IField;
        public get_field_type(): any;
        public get_seed_name(): string;
        public get_sql_value(value: any, type?: any, is_reference?: boolean): any;
        public get_type(): string;
        public get_other_id(entity: any): any;
        public get_other_property(create_if_none?: boolean): Property;
        public get_property_type(): Property_Type;
        public get_referenced_trellis(): Trellis;
        public get_relationship(): Relationships;
        public get_field_query(): string;
        public format_guid(name: string): string;
        public get_field_query2(input_name: any, output_name?: any): string;
        public query(): string;
        public query_virtual(table_name?: string): string;
        public query_virtual_field(table_name?: string, output_name?: string): string;
    }
}
declare module loader {
    interface IProperty_Source {
        name?: string;
        type: string;
        insert?: string;
        is_virtual?: boolean;
        is_readonly?: boolean;
        is_private?: boolean;
        other_property?: string;
        trellis?: string;
        allow_null?: boolean;
    }
    interface ITrellis_Source {
        parent?: string;
        interfaces?: string[];
        name?: string;
        primary_key?: string;
        properties?: any;
        is_virtual?: boolean;
    }
    interface ISchema_Source {
        trellises?: any;
        tables?: any;
        logic?: any;
    }
    function initialize_property(property: landscape.Property, source: IProperty_Source): void;
    function load_schema_from_file(schema: landscape.Schema, filename: string): void;
    function load_property_types(schema: landscape.Schema, property_types: any): void;
    function load_json_from_file(filename: string): any;
}
declare module exporter {
    function get_property_data(property: landscape.Property): loader.IProperty_Source;
    function property_export(property: landscape.Property): loader.IProperty_Source;
}
declare module landscape {
    interface ITrellis {
    }
    class Trellis implements ITrellis {
        public parent: Trellis;
        public mixins: Trellis[];
        public ground: Ground.Core;
        public schema: ISchema;
        public table: Ground.Table;
        public name: string;
        public primary_key: string;
        public is_virtual: boolean;
        public children: Trellis[];
        public properties: {
            [name: string]: Property;
        };
        private all_properties;
        private core_properties;
        public type_property: Property;
        constructor(name: string, schema: Schema);
        public add_property(name: string, source: any): Property;
        public check_primary_key(): void;
        public clone_property(property_name: string, target_trellis: Trellis): void;
        public get_all_links(filter?: (property: Property) => boolean): {};
        public get_all_properties(): any;
        public get_property(name: string): Property;
        public get_core_properties(): any;
        public get_id(source: any): any;
        public get_identity(seed: any): {};
        public get_identity2(value: any): any;
        public get_ancestor_join(other: Trellis): string;
        public get_links(): Property[];
        public get_primary_keys(): any[];
        public get_primary_property(): Property;
        public get_reference_property(other_trellis: Trellis): Property;
        public get_root_table(): Ground.Table;
        public get_table_name(): string;
        public get_table_query(): string;
        public get_tree(): Trellis[];
        public harden(): void;
        public initialize(all: any): void;
        public load_from_object(source: loader.ITrellis_Source): void;
        public query(): string;
        public query_primary_key(): string;
        public sanitize_property(property: any): any;
        public set_parent(parent: Trellis): void;
        public mix(mixin: Trellis): void;
        private seed_has_properties(seed, properties);
        public export_schema(): loader.ITrellis_Source;
    }
}
declare module Ground {
    interface IService_Response {
        objects: any[];
        sql?: string;
    }
    interface Query_Wrapper {
        start: string;
        end: string;
    }
    interface Property_Query_Source {
        name: string;
        filters?: Query_Filter_Source[];
        sorts?: Query_Sort[];
        expansions?: string[];
        properties?: any[];
        subqueries?: any;
        pager?: any;
    }
    interface External_Query_Source extends Property_Query_Source {
        trellis: string;
        map?: any;
        type?: string;
        queries?: External_Query_Source[];
        expires?: number;
        key?: string;
        version?: any;
        return_sql?: boolean;
    }
    class Query {
        public ground: Core;
        public joins: string[];
        public post_clauses: any[];
        public limit: string;
        public trellis: landscape.Trellis;
        public db: Database;
        public include_links: boolean;
        public fields: string[];
        public base_path: string;
        public arguments: {};
        public expansions: string[];
        public wrappers: Query_Wrapper[];
        private row_cache;
        public type: string;
        public properties: any;
        public source: External_Query_Source;
        public sorts: Query_Sort[];
        public filters: string[];
        public run_stack: any;
        public property_filters: Query_Filter_Source[];
        static operators: string[];
        private links;
        constructor(trellis: landscape.Trellis, base_path?: string);
        public add_arguments(args: any): void;
        public add_filter(clause: string, arguments?: any[]): void;
        public add_property_filter(property: string, value?: any, operator?: string): void;
        public add_key_filter(value: any): void;
        public add_field(clause: string, arguments?: any): void;
        public add_join(clause: string, arguments?: any): void;
        public add_post(clause: string, arguments?: any): void;
        public add_expansion(clause: any): void;
        public add_link(property: any): void;
        public add_sort(sort: Query_Sort): void;
        static process_sorts(sorts: Query_Sort[], trellis: landscape.Trellis): string;
        public add_wrapper(wrapper: Query_Wrapper): void;
        public generate_pager(offset?: number, limit?: number): string;
        public generate_sql(properties: any): string;
        public get_fields_and_joins(properties: {
            [name: string]: landscape.Property;
        }, include_primary_key?: boolean): Internal_Query_Source;
        public get_primary_key_value(): any;
        static generate_property_join(property: landscape.Property, seeds: any): string;
        public create_sub_query(trellis: landscape.Trellis, property: landscape.Property): Query;
        public get_many_list(seed: any, property: landscape.Property, relationship: landscape.Relationships): Promise;
        public get_path(...args: string[]): string;
        public get_reference_object(row: any, property: landscape.Property): any;
        public has_expansion(path: string): boolean;
        public process_row(row: any): Promise;
        public query_link_property(seed: any, property: any): Promise;
        public process_property_filter(filter: any): Internal_Query_Source;
        public process_property_filters(): Internal_Query_Source;
        public extend(source: External_Query_Source): void;
        public run_core(): Promise;
        public run(): Promise;
        static get_identity_sql(property: landscape.Property, cross_property?: landscape.Property): string;
        static generate_join(property: landscape.Property, cross_property?: landscape.Property): string;
        static query_path(path: string, args: any[], ground: Core): Promise;
        static follow_path(path: any, args: any[], ground: Core): string;
        private static process_tokens(tokens, args, ground);
    }
}
declare var uuid: any;
declare module Ground {
    interface IUser {
        id: any;
    }
    class Update implements IUpdate {
        public seed: ISeed;
        private fields;
        public override: boolean;
        public trellis: landscape.Trellis;
        public main_table: string;
        public ground: Core;
        public db: Database;
        public user: IUser;
        public log_queries: boolean;
        public run_stack: any;
        constructor(trellis: landscape.Trellis, seed: ISeed, ground?: Core);
        public get_access_name(): string;
        private generate_sql(trellis);
        private update_embedded_seed(property, value);
        private update_embedded_seeds(core_properties);
        private create_record(trellis);
        private update_record(trellis, id, key_condition);
        private apply_insert(property, value);
        public is_create_property(property: landscape.Property): boolean;
        private get_field_value(property, seed);
        private is_update_property(property);
        private update_links(trellis, id, create?);
        private update_many_to_many(property, create?);
        private update_one_to_many(property);
        private update_reference(property, id);
        private update_reference_object(other, property);
        public run(): Promise;
    }
}
declare module Ground {
    class Delete implements IUpdate {
        public ground: Core;
        public trellis: landscape.Trellis;
        public seed: any;
        public max_depth: number;
        constructor(ground: Core, trellis: landscape.Trellis, seed: ISeed);
        public get_access_name(): string;
        private delete_child(link, id, depth?);
        private delete_children(trellis, id, depth?);
        public delete_record(trellis: landscape.Trellis, seed: any): Promise;
        private get_child_links(trellis);
        public run(depth?: number): Promise;
        private run_delete(trellis, seed, depth?);
    }
}
declare module landscape {
    class Property_Type {
        public name: string;
        public property_class: any;
        public field_type: any;
        public default_value: any;
        public parent: Property_Type;
        public allow_null: boolean;
        constructor(name: string, info: any, types: Property_Type[]);
        public get_field_type(): any;
    }
}
declare var when: any;
declare module landscape {
    interface ISchema_Source {
        trellises?: any;
        tables?: any;
        logic?: any;
    }
    class Schema implements ISchema {
        public property_types: Property_Type[];
        public trellises: {
            [key: string]: Trellis;
        };
        public custom_tables: Ground.Table[];
        public tables: Ground.Table[];
        public ground: Ground.Core;
        constructor();
        public load_property_types(filename: string): void;
        public get_base_property_type(type: any): any;
        public convert_value(value: any, type: any): any;
        static to_bool(input: any): boolean;
        public add_trellis(name: string, source: loader.ITrellis_Source, initialize_parent?: boolean): Trellis;
        public get_trellis(trellis: any): Trellis;
        public parse_schema(data: ISchema_Source, ground: any): void;
        public initialize_trellises(subset: Trellis[], all?: any): void;
        public load_trellises(trellises: loader.ITrellis_Source[]): Trellis[];
        public harden(): void;
    }
}
declare module Ground {
    class InputError {
        public name: string;
        public message: any;
        public stack: any;
        public status: number;
        public details: any;
        public key: any;
        constructor(message: string, key?: any);
    }
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
    function path_to_array(path: any): any;
    class Core extends MetaHub.Meta_Object {
        public trellises: {
            [key: string]: landscape.Trellis;
        };
        public custom_tables: Table[];
        public tables: Table[];
        public property_types: landscape.Property_Type[];
        public db: Database;
        public log_queries: boolean;
        public log_updates: boolean;
        public schema: landscape.Schema;
        public query_schema: any;
        public update_schema: any;
        constructor(config: any, db_name: string);
        private static load_relative_json_file(path);
        public add_trellis(name: string, source: loader.ITrellis_Source, initialize_parent?: boolean): landscape.Trellis;
        public get_base_property_type(type: any): any;
        public get_identity(trellis: string, seed: any): any;
        public get_trellis(trellis: any): landscape.Trellis;
        public convert_value(value: any, type: any): any;
        public create_query(trellis_name: string, base_path?: string): Query_Builder;
        public create_update(trellis: any, seed?: ISeed, user?: IUser): IUpdate;
        public delete_object(trellis: landscape.Trellis, seed: ISeed): Promise;
        public insert_object(trellis: any, seed?: ISeed, user?: IUser, as_service?: boolean): Promise;
        static is_private(property: landscape.Property): boolean;
        static is_private_or_readonly(property: landscape.Property): boolean;
        public update_object(trellis: any, seed?: ISeed, user?: IUser, as_service?: boolean): Promise;
        static load_json_from_file(filename: string): any;
        public load_schema_from_file(filename: string): void;
        static remove_fields(object: any, trellis: landscape.Trellis, filter: any): any;
        public sanitize_trellis_argument(trellis: any): landscape.Trellis;
        public stop(): void;
        static to_bool(input: any): boolean;
        public export_schema(): {
            objects: any[];
        };
        static perspective(seed: any, trellis: landscape.Trellis, property: landscape.Property): any;
        public harden_schema(): void;
    }
}
declare module Ground {
    interface Identity {
        name: string;
        trellis: landscape.Trellis;
        keys: Identity_Key[];
    }
    interface Identity_Key {
        name: string;
        type: string;
        property: landscape.Property;
    }
    class Link_Trellis implements landscape.ITrellis {
        public properties: any;
        public seed: any;
        public table_name: string;
        public trellises: landscape.Trellis[];
        public trellis_dictionary: {};
        public identities: Identity[];
        public alias: string;
        constructor(trellises: landscape.Trellis[], table_name?: string);
        public create_identity(trellis: landscape.Trellis): Identity;
        static create_from_property(property: landscape.Property): Link_Trellis;
        static create_reference(property: landscape.Property, name: string): Identity_Key;
        public generate_join(seeds: {}): string;
        public generate_delete_row(seeds: any[]): string;
        public generate_insert(seeds: any): string;
        private generate_table_name();
        public get_key_condition(key: Identity_Key, seed: any, fill_blanks?: boolean): string;
        public get_condition_string(seeds: any): string;
        public get_identity_conditions(identity: Identity, seed: any, fill_blanks?: boolean): any[];
        public get_conditions(seeds: any): string[];
        public get_identity_by_trellis(trellis: landscape.Trellis): Identity;
        public get_table_declaration(): string;
    }
}
declare module Ground {
    module SQL {
        function get_link_sql_value(link: Link_Field, value: any): any;
    }
}
declare module Ground {
    interface Expression {
        type?: string;
    }
    class Expression_Engine {
        static resolve(expression: any, context: any): any;
        static resolve_function(expression: Function_Expression, context: any): void;
    }
}
declare module Ground {
    class Record_Count extends MetaHub.Meta_Object {
        public ground: Core;
        public parent: landscape.Trellis;
        public child: landscape.Trellis;
        public count_name: string;
        constructor(ground: Core, parent: any, property_name: string, count_name: string);
        public count(seed: any): Promise;
    }
    class Join_Count extends MetaHub.Meta_Object {
        public ground: Core;
        public parent: landscape.Trellis;
        public link: Cross_Trellis;
        public count_name: string;
        public property: landscape.Property;
        constructor(ground: Core, property: landscape.Property, count_name: string);
        public count(seed: any, property: landscape.Property): Promise;
    }
    class Multi_Count extends MetaHub.Meta_Object {
        public ground: Core;
        public trellis: landscape.Trellis;
        public count_name: string;
        public count_fields: string[];
        constructor(ground: Core, trellis: string, count_name: any, sources: MetaHub.Meta_Object[]);
        public count(key: any): Promise;
    }
}
declare module Ground {
    interface Statement {
        type: string;
    }
    interface Statement_Block extends Statement {
        path: string;
        statements: Statement[];
    }
    interface Constraint_Statement extends Statement {
        trellis: string;
        property: string;
        expression: Expression;
    }
    interface Constraint_Statement2 extends Statement {
        path: string[];
        expression: Expression;
    }
    interface Symbol_Statement extends Statement {
        name: string;
        expression: Expression;
    }
    interface Function_Expression extends Expression {
        name: string;
        arguments: Expression[];
    }
    interface Function_Expression2 extends Expression {
        name: string;
        inputs: Expression[];
    }
    interface Reference_Expression extends Expression {
        path: string;
    }
    class Scope {
        public symbols: {};
        public constraints: {};
        public _this: any;
        public parent: Scope;
        constructor(parent?: Scope);
        public add_symbol(name: string, value: any): void;
        public get_symbol(name: string): any;
        public get_constraint(name: string): any;
    }
    class Logic {
        static load(ground: Core, statements: Statement[]): void;
        static load_constraint(ground: Core, source: Constraint_Statement, scope: Scope): MetaHub.Meta_Object;
        static create_symbol(ground: Core, source: Symbol_Statement, scope: Scope): void;
        static load2(ground: Core, statements: Statement[], scope?: Scope): void;
        static load_constraint2(ground: Core, source: Constraint_Statement2, scope: Scope): MetaHub.Meta_Object;
        static create_symbol2(ground: Core, source: Symbol_Statement, scope: Scope): void;
        static trellis_scope(ground: Core, source: Statement_Block, scope: Scope): void;
    }
}
declare module Ground {
    interface IJoin {
        render(): string;
    }
    interface Join_Trellis {
        get_table_name(): string;
        get_primary_keys(): Join_Property[];
        get_alias(): string;
        query_identity(): string;
    }
    class Join_Trellis_Wrapper implements Join_Trellis {
        public trellis: landscape.Trellis;
        public alias: string;
        constructor(trellis: landscape.Trellis, alias?: string);
        static create_using_property(trellis: landscape.Trellis, property: landscape.Property): Join_Trellis_Wrapper;
        public get_alias(): string;
        public get_primary_keys(): Join_Property[];
        public get_table_name(): string;
        public query_identity(): string;
    }
    class Cross_Trellis implements Join_Trellis {
        public name: string;
        public alias: string;
        public properties: Join_Property[];
        public identities: Join_Property[];
        constructor(property: landscape.Property);
        static generate_name(first: landscape.Trellis, second: landscape.Trellis): string;
        private static get_field_name(property);
        public get_primary_keys(): Join_Property[];
        private static create_properties(cross, property);
        public generate_delete(property: landscape.Property, owner: any, other: any): string;
        public generate_insert(property: landscape.Property, owner: any, other: any): string;
        public order_identities(property: landscape.Property): Join_Property[];
        public get_alias(): string;
        public get_table_name(): string;
        public query_identity(): string;
    }
    class Cross_Trellis2 {
        public alias: string;
        public table: Table;
        constructor(property: landscape.Property, alias?: string);
        public generate_insert(property: landscape.Property, owner: any, other: any): string;
        public order_identities(property: landscape.Property): Link_Field[];
    }
    class Join_Property {
        public parent: Join_Trellis;
        public other_trellis: Join_Trellis;
        public field_name: string;
        public type: string;
        public other_property: Join_Property;
        public name: string;
        public property: landscape.Property;
        constructor(parent: Join_Trellis, other_trellis: Join_Trellis, name: string, type: string, field_name?: string, other_property?: Join_Property);
        static create_from_property(property: landscape.Property, other_trellis?: Join_Trellis, other_property?: Join_Property): Join_Property;
        public get_comparison(value: any): string;
        public query(): string;
        static pair(first: Join_Property, second: Join_Property): void;
        public get_sql_value(value: any): any;
    }
    class Join_Tree {
        public property: landscape.Property;
        public trellis: landscape.Trellis;
        public children: Join_Tree[];
        constructor(property: landscape.Property, trellis: landscape.Trellis);
        static get(tree: Join_Tree[], property: landscape.Property, next: landscape.Trellis): Join_Tree;
    }
    class Join {
        static generate_table_name(trellis: landscape.Trellis, property: landscape.Property): string;
        static get_last_reference(property_chain: landscape.Property[]): landscape.Property;
        static paths_to_tree(base: landscape.Trellis, paths: any[]): Join_Tree[];
        private static convert(branch, previous, result);
        static tree_to_joins(tree: Join_Tree[], previous?: Join_Trellis): IJoin[];
        static render_paths(trellis: landscape.Trellis, paths: landscape.Property[][]): string[];
        static path_to_property_chain(base: landscape.Trellis, path: any): landscape.Property[];
        static get_end_query(property_chain: landscape.Property[]): string;
    }
    class Reference_Join implements IJoin {
        public property: Join_Property;
        public first: Join_Trellis;
        public second: Join_Trellis;
        constructor(property: Join_Property, first: Join_Trellis, second: Join_Trellis);
        public render(): string;
        private get_condition();
        private get_query_reference(trellis, property);
    }
    class Composite_Join implements IJoin {
        public first: Join_Trellis;
        public second: Join_Trellis;
        constructor(first: Join_Trellis, second: Join_Trellis);
        public render(): string;
        private get_condition();
    }
}
declare module Ground {
    interface Query_Result {
        query_count: number;
        return_sql?: boolean;
        user: any;
    }
    interface IPager {
        limit?: any;
        offset?: any;
    }
    interface Query_Filter_Source {
        property?: string;
        path?: string;
        value: any;
        operator?: string;
        type?: string;
        filters?: Query_Filter_Source[];
    }
    interface Query_Filter {
        path?: string;
        property?: landscape.Property;
        value?: any;
        operator?: string;
        type?: string;
        filters?: Query_Filter[];
    }
    interface Condition_Source {
        path?: string;
        value?: any;
        operator?: string;
        type?: string;
        filters?: Condition_Source[];
    }
    interface Condition {
        path?: landscape.Property[];
        value?: any;
        operator?: string;
        type?: string;
        filters?: Condition[];
    }
    interface Query_Sort {
        property?: any;
        path?: any;
        dir?: any;
    }
    interface Query_Transform {
        clause: string;
    }
    class Query_Builder {
        public ground: Core;
        public trellis: landscape.Trellis;
        public pager: IPager;
        public type: string;
        public properties: any;
        public condition: Condition;
        public sorts: Query_Sort[];
        public source: External_Query_Source;
        public include_links: boolean;
        public transforms: Query_Transform[];
        public subqueries: {};
        public map: {};
        public queries: Query_Builder[];
        public optimized_union: boolean;
        static operators: {
            '=': any;
            'like': {
                "render": (result: any, filter: any, property: any, data: any) => void;
            };
            'LIKE': {
                "render": (result: any, filter: any, property: any, data: any) => void;
            };
            '!=': any;
            '<': any;
            '>': any;
            '<=': any;
            '>=': any;
            '=>': any;
            '=<': any;
            'in': {
                "render": (result: any, filter: any, property: landscape.Property, data: any) => void;
                "validate": (value: any, path: any, query: any) => boolean;
            };
            'IN': {
                "render": (result: any, filter: any, property: landscape.Property, data: any) => void;
                "validate": (value: any, path: any, query: any) => boolean;
            };
        };
        public filters: Query_Filter[];
        constructor(trellis: landscape.Trellis);
        static create(ground: Core, source?: any): Query_Builder;
        static add_operator(symbol: string, action: any): void;
        public add_filter(path: string, value?: any, operator?: string): void;
        public create_filter(source: Query_Filter_Source): Query_Filter;
        public add_key_filter(value: any): void;
        public add_sort(sort: Query_Sort): void;
        public add_map(target: string, source?: any): void;
        public add_query(source: any): Query_Builder;
        public add_subquery(property_name: string, source?: any): Query_Builder;
        public add_transform_clause(clause: string): void;
        public create_runner(): Query_Runner;
        static create_join_filter(property: landscape.Property, seed: any): Query_Filter;
        public extend(source: any): void;
        public add_properties(source_properties: any): void;
        public add_expansions(expansions: any): void;
        public get_primary_key_value(): any;
        public get_properties(): any;
        public get_field_properties(): {};
        public get_field_properties2(): landscape.Property[];
        public run(user: any, query_result?: Query_Result): Promise;
        public run_single(user: any, query_result?: Query_Result): Promise;
    }
}
declare module Ground {
    interface Internal_Query_Source {
        fields?: any;
        filters?: any[];
        joins?: string[];
        property_joins?: landscape.Property[][];
        arguments?: any;
        references?: any;
    }
    interface Query_Parts {
        fields: string;
        from: string;
        joins: string;
        filters: string;
        sorts: string;
        pager: string;
        args: any;
        all_references: Embedded_Reference[];
        reference_hierarchy: Embedded_Reference[];
        dummy_references: Embedded_Reference[];
        field_list: Field_List;
        query_id: number;
    }
    class Query_Renderer {
        public ground: Core;
        static counter: number;
        constructor(ground: Core);
        static apply_arguments(sql: string, args: any): string;
        static generate_property_join(property: landscape.Property, seeds: any): string;
        public generate_sql(parts: Query_Parts, source: Query_Builder): string;
        private get_group_keys(trellis);
        public generate_count(parts: Query_Parts): string;
        public generate_union(parts: Query_Parts, queries: string[], source: Query_Builder): string;
        public generate_union_count(parts: Query_Parts, queries: string[], source: Query_Builder): string;
        public generate_parts(source: Query_Builder, query_id?: number): Query_Parts;
        private static add_path(path, trellis, result);
        static get_chain(path: any, trellis: landscape.Trellis): landscape.Property[];
        private static add_chain(property_chain, result);
        private static build_filter(source, filter, ground);
        private static prepare_condition(source, condition, ground);
        static build_filters(source: Query_Builder, filters: Query_Filter[], ground: Core, is_root: boolean, mode?: string): Internal_Query_Source;
        static merge_additions(original: Internal_Query_Source, additions: Internal_Query_Source): Internal_Query_Source;
        static render_sorts(source: Query_Builder, result: Internal_Query_Source): string;
        static render_pager(pager: IPager): string;
    }
}
declare module Ground {
    interface IQuery_Preparation {
        queries?: string[];
        is_empty: boolean;
    }
    interface IQuery_Render_Result {
        sql: string;
        parts: any;
    }
    class Query_Runner {
        public source: Query_Builder;
        public run_stack: any;
        private row_cache;
        public ground: Core;
        public renderer: Query_Renderer;
        static trellis_cache: any;
        constructor(source: Query_Builder);
        private static generate_property_join(property, seeds);
        private static create_sub_query(trellis, property, source);
        private static get_many_list(seed, property, relationship, source, query_result);
        private static get_reference_object(row, property, source, query_result);
        public process_map(row: any, source: Query_Builder, links: any, query_result: Query_Result): any;
        public process_row_step_one(row: any, source: Query_Builder, query_result: Query_Result, parts: Query_Parts): Promise;
        public process_row_step_two(row: any, source: Query_Builder, trellis: landscape.Trellis, query_result: Query_Result, parts: Query_Parts): Promise;
        public process_reference_children(child: any, query: Query_Builder, query_result: Query_Result): Promise;
        private static get_trellis_cache(trellis);
        public query_link_property(seed: any, property: any, source: Query_Builder, query_result: Query_Result): Promise;
        public prepare(query_id?: number): Promise;
        public render(parts: any): Promise;
        public render_union(parts: any): Promise;
        static hack_field_alias(field: string): string;
        public normalize_union_fields(runner_parts: any): void;
        public get_source(row: any): Query_Builder;
        public get_parts(row: any, render_result: any): Query_Parts;
        public run(query_result: Query_Result): Promise;
        public paging(render_result: any, result: any): Promise;
        public run_single(query_result: Query_Result): Promise;
    }
}
declare module Ground {
    class Embedded_Reference {
        public property: landscape.Property;
        public properties: landscape.Property[];
        public tables: {};
        public children: Embedded_Reference[];
        constructor(property: landscape.Property, id: number, properties: landscape.Property[], previous?: Join_Trellis);
        public get_field_name(property: landscape.Property): string;
        private get_table(property);
        public render(): string;
        public render_field(property: landscape.Property): string;
        public render_dummy_field(property: landscape.Property): string;
        public cleanup_empty(source: any): void;
        public cleanup_entity(source: any, target: any): void;
        static has_reference(list: Embedded_Reference[], reference: Embedded_Reference): boolean;
    }
}
declare module Ground {
    class Field_List implements Internal_Query_Source {
        public source: Query_Builder;
        public properties: any;
        public derived_properties: any;
        public fields: any[];
        public joins: string[];
        public trellises: {};
        public reference_hierarchy: Embedded_Reference[];
        public all_references: Embedded_Reference[];
        public reference_join_count: number;
        constructor(source: Query_Builder);
        private generate_ancestor_joins(source);
        private render_field(property);
        private render_reference_fields(property, query, previous?);
        private map_fields();
        private get_property(name);
        private map_field(name);
        static get_derived_properties(trellis: landscape.Trellis): any[];
    }
}
declare module "vineyard-ground" {
  export = Ground
}