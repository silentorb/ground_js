/// <reference path="../defs/node.d.ts" />
/// <reference path="../../vineyard-metahub/metahub.d.ts" />
declare module landscape {
    class Property_Type {
        name: string;
        property_class: any;
        field_type: any;
        default_value: any;
        parent: Property_Type;
        allow_null: boolean;
        constructor(name: string, info: any, types: Property_Type[]);
        get_field_type(): any;
    }
}
declare module landscape {
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
    enum Relationships {
        none = 0,
        one_to_one = 1,
        one_to_many = 2,
        many_to_many = 3,
    }
    class Property {
        name: string;
        parent: Trellis;
        type: string;
        insert: string;
        other_property: string;
        "default": any;
        other_trellis: Trellis;
        other_trellis_name: string;
        is_private: boolean;
        is_parent: boolean;
        is_readonly: boolean;
        is_virtual: boolean;
        is_composite_sub: boolean;
        is_unique: boolean;
        composite_properties: any[];
        access: string;
        allow_null: boolean;
        constructor(name: string, source: IProperty_Source, trellis: Trellis);
        initialize_composite_reference(other_trellis: Trellis): void;
        fullname(): string;
        get_allow_null(): boolean;
        get_composite(): Property[];
        get_data(): IProperty_Source;
        get_default(): any;
        get_field_name(): string;
        get_field_override(create_if_missing?: boolean): IField;
        get_field_type(): any;
        get_seed_name(): string;
        get_sql_value(value: any, type?: any, is_reference?: boolean): any;
        get_type(): string;
        get_other_id(entity: any): any;
        get_other_property(create_if_none?: boolean): Property;
        get_property_type(): Property_Type;
        get_referenced_trellis(): Trellis;
        get_relationship(): Relationships;
        get_field_query(): string;
        format_guid(name: string): string;
        get_field_query2(input_name: any, output_name?: any): string;
        query(): string;
        query_virtual(table_name?: string): string;
        query_virtual_field(table_name?: string, output_name?: string): string;
        export_schema(): IProperty_Source;
    }
}
declare module landscape {
    interface ITrellis_Source {
        parent?: string;
        name?: string;
        primary_key?: string;
        properties?: any;
        is_virtual?: boolean;
    }
    interface ITrellis {
    }
    class Trellis implements ITrellis {
        parent: Trellis;
        parent_name: string;
        schema: Schema;
        table: Table;
        name: string;
        primary_key: string;
        is_virtual: boolean;
        children: Trellis[];
        properties: {
            [name: string]: Property;
        };
        private all_properties;
        private core_properties;
        type_property: Property;
        constructor(name: string, schema: Schema);
        add_property(name: string, source: any): Property;
        check_primary_key(): void;
        clone_property(property_name: string, target_trellis: Trellis): void;
        get_all_links(filter?: (property: Property) => boolean): {};
        get_all_properties(): any;
        get_property(name: string): Property;
        get_core_properties(): any;
        get_id(source: any): any;
        get_identity(seed: any): {};
        get_identity2(value: any): any;
        get_ancestor_join(other: Trellis): string;
        get_links(): Property[];
        get_primary_keys(): any[];
        get_primary_property(): Property;
        get_reference_property(other_trellis: Trellis): Property;
        get_root_table(): Table;
        get_table_name(): string;
        get_table_query(): string;
        get_tree(): Trellis[];
        harden(): void;
        initialize(all: any): void;
        load_from_object(source: ITrellis_Source): void;
        query(): string;
        query_primary_key(): string;
        sanitize_property(property: any): any;
        set_parent(parent: Trellis): void;
        seed_has_properties(seed: any, properties: string[]): boolean;
        export_schema(): ITrellis_Source;
    }
}
declare module landscape {
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
        name: string;
        parent: Table;
        other_table: Table;
        type: Link_Field_Type;
        other_link: Link_Field;
        field: IField;
        property: Property;
        constructor(name: string, parent: Table, other_table: Table, type: Link_Field_Type);
    }
    class Table {
        name: string;
        properties: {};
        indexes: any[];
        schema: Schema;
        db_name: string;
        trellis: Trellis;
        primary_keys: any[];
        query: string;
        links: {};
        constructor(name: string, schema: Schema);
        connect_trellis(trellis: Trellis): void;
        static create_from_trellis(trellis: Trellis, schema: Schema): Table;
        static get_other_table(property: Property, schema: Schema): Table;
        static get_other_table_name(property: Property): string;
        static generate_cross_name(first: Trellis, second: Trellis): string;
        create_link(property: Property): void;
        create_sql(schema: Schema): string;
        static create_sql_from_array(table_name: string, source: any[], primary_keys?: any[], indexes?: any[]): string;
        create_sql_from_trellis(trellis: Trellis): string;
        private get_primary_keys(trellis);
        static format_value(value: any): any;
        static generate_index_sql(index: Index): string;
        load_from_schema(source: any): void;
    }
}
declare var when: any;
declare module landscape {
    interface ISchema_Source {
        trellises?: any;
        tables?: any;
        views?: any;
        logic?: any;
    }
    class Schema {
        property_types: Property_Type[];
        trellises: {
            [key: string]: Trellis;
        };
        views: any[];
        custom_tables: Table[];
        tables: Table[];
        get_base_property_type(type: any): any;
        convert_value(value: any, type: any): any;
        static to_bool(input: any): boolean;
        load_property_types(property_types: any): void;
        static load_json_from_file(filename: string): any;
        add_trellis(name: string, source: ITrellis_Source, initialize_parent?: boolean): Trellis;
        get_trellis(trellis: any): Trellis;
        parse_schema(data: ISchema_Source, ground: any): void;
        initialize_trellises(subset: Trellis[], all?: any): void;
        load_trellises(trellises: ITrellis_Source[]): Trellis[];
        harden(): void;
    }
}
