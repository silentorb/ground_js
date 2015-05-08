/// <reference path="../../vineyard-metahub/metahub.d.ts" />
/// <reference path="landscape.d.ts" />
declare module mining {
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
    interface Internal_Query_Source {
        fields?: any;
        filters?: any[];
        joins?: string[];
        property_joins?: landscape.Property[][];
        arguments?: any;
        references?: any;
    }
    class InputError {
        name: string;
        message: any;
        stack: any;
        status: number;
        details: any;
        key: any;
        constructor(message: string, key?: any);
    }
    function path_to_array(path: any): any;
}
declare module mining {
    class Embedded_Reference {
        property: landscape.Property;
        properties: landscape.Property[];
        tables: {};
        children: Embedded_Reference[];
        constructor(property: landscape.Property, id: number, properties: landscape.Property[], previous?: Join_Trellis);
        get_field_name(property: landscape.Property): string;
        private get_table(property);
        render(): string;
        render_field(property: landscape.Property): string;
        render_dummy_field(property: landscape.Property): string;
        cleanup_empty(source: any): void;
        cleanup_entity(source: any, target: any): void;
        static has_reference(list: Embedded_Reference[], reference: Embedded_Reference): boolean;
    }
}
declare module mining {
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
    class Link_Trellis {
        properties: any;
        seed: any;
        table_name: string;
        trellises: landscape.Trellis[];
        trellis_dictionary: {};
        identities: Identity[];
        alias: string;
        constructor(trellises: landscape.Trellis[], table_name?: string);
        create_identity(trellis: landscape.Trellis): Identity;
        static create_from_property(property: landscape.Property): Link_Trellis;
        static create_reference(property: landscape.Property, name: string): Identity_Key;
        generate_join(seeds: {}): string;
        generate_delete_row(seeds: any[]): string;
        generate_insert(seeds: any): string;
        private generate_table_name();
        get_key_condition(key: Identity_Key, seed: any, fill_blanks?: boolean): string;
        get_condition_string(seeds: any): string;
        get_identity_conditions(identity: Identity, seed: any, fill_blanks?: boolean): any[];
        get_conditions(seeds: any): string[];
        get_identity_by_trellis(trellis: landscape.Trellis): Identity;
        get_table_declaration(): string;
    }
}
declare module mining {
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
        schema: landscape.Schema;
        static counter: number;
        constructor(schema: landscape.Schema);
        static apply_arguments(sql: string, args: any): string;
        static generate_property_join(property: landscape.Property, seeds: any): string;
        generate_sql(parts: Query_Parts, source: Query_Builder): string;
        private get_group_keys(trellis);
        generate_count(parts: Query_Parts): string;
        generate_union(parts: Query_Parts, queries: string[], source: Query_Builder): string;
        generate_union_count(parts: Query_Parts, queries: string[], source: Query_Builder): string;
        generate_parts(source: Query_Builder, query_id?: number): Query_Parts;
        private static add_path(path, trellis, result);
        static get_chain(path: any, trellis: landscape.Trellis): landscape.Property[];
        private static add_chain(property_chain, result);
        private static build_filter(source, filter, schema);
        private static prepare_condition(source, condition, schema);
        static build_filters(source: Query_Builder, filters: Query_Filter[], schema: landscape.Schema, is_root: boolean, mode?: string): Internal_Query_Source;
        static merge_additions(original: Internal_Query_Source, additions: Internal_Query_Source): Internal_Query_Source;
        static render_sorts(source: Query_Builder, result: Internal_Query_Source): string;
        static render_pager(pager: IPager): string;
    }
}
declare module mining {
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
        symbols: {};
        constraints: {};
        _this: any;
        parent: Scope;
        constructor(parent?: Scope);
        add_symbol(name: string, value: any): void;
        get_symbol(name: string): any;
        get_constraint(name: string): any;
    }
}
declare module mining {
    interface Expression {
        type?: string;
    }
    class Expression_Engine {
        static resolve(expression: any, context: any): any;
        static resolve_function(expression: Function_Expression, context: any): void;
    }
}
declare module mining {
    interface IQuery_Preparation {
        queries?: string[];
        is_empty: boolean;
    }
    interface IQuery_Render_Result {
        sql: string;
        parts: any;
    }
    class Query_Runner {
        source: Query_Builder;
        run_stack: any;
        miner: Miner;
        private row_cache;
        renderer: Query_Renderer;
        static trellis_cache: any;
        constructor(source: Query_Builder, miner: Miner);
        private static generate_property_join(property, seeds);
        private static create_sub_query(trellis, property, source);
        private static get_many_list(seed, property, relationship, source, query_result, miner);
        private static get_reference_object(row, property, source, query_result, miner);
        process_map(row: any, source: Query_Builder, links: any, query_result: Query_Result): any;
        get_inherited_trellis(row: any, trellis: landscape.Trellis): landscape.Trellis;
        query_inherited_row(row: any, source: Query_Builder, trellis: landscape.Trellis, query_result: Query_Result): Promise;
        process_row_step_one(row: any, source: Query_Builder, query_result: Query_Result, parts: Query_Parts): Promise;
        process_row_step_two(row: any, source: Query_Builder, trellis: landscape.Trellis, query_result: Query_Result, parts: Query_Parts): Promise;
        process_reference_children(child: any, query: Query_Builder, query_result: Query_Result): Promise;
        private static get_trellis_cache(trellis);
        query_link_property(seed: any, property: any, source: Query_Builder, query_result: Query_Result): Promise;
        prepare(query_id?: number): Promise;
        render(parts: any): Promise;
        render_union(parts: any): Promise;
        static hack_field_alias(field: string): string;
        normalize_union_fields(runner_parts: any): void;
        get_source(row: any): Query_Builder;
        get_parts(row: any, render_result: any): Query_Parts;
        run(query_result: Query_Result): Promise;
        paging(render_result: any, result: any): Promise;
        run_single(query_result: Query_Result): Promise;
    }
}
declare module mining {
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
        schema: landscape.Schema;
        trellis: landscape.Trellis;
        pager: IPager;
        type: string;
        properties: any;
        condition: Condition;
        sorts: Query_Sort[];
        source: External_Query_Source;
        include_links: boolean;
        transforms: Query_Transform[];
        subqueries: {};
        map: {};
        queries: Query_Builder[];
        optimized_union: boolean;
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
        filters: Query_Filter[];
        constructor(trellis: landscape.Trellis, schema: landscape.Schema);
        static create(schema: landscape.Schema, source?: any): Query_Builder;
        static add_operator(symbol: string, action: any): void;
        add_filter(path: string, value?: any, operator?: string): void;
        create_filter(source: Query_Filter_Source): Query_Filter;
        add_key_filter(value: any): void;
        add_sort(sort: Query_Sort): void;
        add_map(target: string, source?: any): void;
        add_query(source: any): Query_Builder;
        add_subquery(property_name: string, source?: any): Query_Builder;
        add_transform_clause(clause: string): void;
        create_runner(miner: Miner): Query_Runner;
        static create_join_filter(property: landscape.Property, seed: any): Query_Filter;
        extend(source: any): void;
        add_properties(source_properties: any): void;
        add_expansions(expansions: any): void;
        get_primary_key_value(): any;
        get_properties(): any;
        get_field_properties(): {};
        get_field_properties2(): landscape.Property[];
        run(user: any, miner: Miner, query_result?: Query_Result): Promise;
        run_single(user: any, miner: Miner, query_result?: Query_Result): Promise;
    }
}
declare module mining {
    class Field_List implements Internal_Query_Source {
        source: Query_Builder;
        properties: any;
        derived_properties: any;
        fields: any[];
        joins: string[];
        trellises: {};
        reference_hierarchy: Embedded_Reference[];
        all_references: Embedded_Reference[];
        reference_join_count: number;
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
declare module mining {
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
        trellis: landscape.Trellis;
        alias: string;
        constructor(trellis: landscape.Trellis, alias?: string);
        static create_using_property(trellis: landscape.Trellis, property: landscape.Property): Join_Trellis_Wrapper;
        get_alias(): string;
        get_primary_keys(): Join_Property[];
        get_table_name(): string;
        query_identity(): string;
    }
    class Cross_Trellis implements Join_Trellis {
        name: string;
        alias: string;
        properties: Join_Property[];
        identities: Join_Property[];
        constructor(property: landscape.Property);
        static generate_name(first: landscape.Trellis, second: landscape.Trellis): string;
        private static get_field_name(property);
        get_primary_keys(): Join_Property[];
        private static create_properties(cross, property);
        generate_delete(property: landscape.Property, owner: any, other: any): string;
        generate_insert(property: landscape.Property, owner: any, other: any): string;
        order_identities(property: landscape.Property): Join_Property[];
        get_alias(): string;
        get_table_name(): string;
        query_identity(): string;
    }
    class Cross_Trellis2 {
        alias: string;
        table: landscape.Table;
        constructor(property: landscape.Property, schema: landscape.Schema, alias?: string);
        generate_insert(property: landscape.Property, owner: any, other: any): string;
        order_identities(property: landscape.Property): landscape.Link_Field[];
    }
    class Join_Property {
        parent: Join_Trellis;
        other_trellis: Join_Trellis;
        field_name: string;
        type: string;
        other_property: Join_Property;
        name: string;
        property: landscape.Property;
        constructor(parent: Join_Trellis, other_trellis: Join_Trellis, name: string, type: string, field_name?: string, other_property?: Join_Property);
        static create_from_property(property: landscape.Property, other_trellis?: Join_Trellis, other_property?: Join_Property): Join_Property;
        get_comparison(value: any): string;
        query(): string;
        static pair(first: Join_Property, second: Join_Property): void;
        get_sql_value(value: any): any;
    }
    class Join_Tree {
        property: landscape.Property;
        trellis: landscape.Trellis;
        children: Join_Tree[];
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
        property: Join_Property;
        first: Join_Trellis;
        second: Join_Trellis;
        constructor(property: Join_Property, first: Join_Trellis, second: Join_Trellis);
        render(): string;
        private get_condition();
        private get_query_reference(trellis, property);
    }
    class Composite_Join implements IJoin {
        first: Join_Trellis;
        second: Join_Trellis;
        constructor(first: Join_Trellis, second: Join_Trellis);
        render(): string;
        private get_condition();
    }
}
declare module mining {
    interface IQueryable {
        query(sql: string, args?: any[], pool?: any): Promise;
        query_single(sql: string, args?: any[]): Promise;
    }
    class Miner {
        messenger: MetaHub.Meta_Object;
        db: IQueryable;
        schema: landscape.Schema;
        constructor(schema: landscape.Schema, db: IQueryable, messenger: MetaHub.Meta_Object);
    }
}
