/// <reference path="require.d.ts" />
/// <reference path="../references.d.ts" />
/// <reference path="../db/Database.d.ts" />
/// <reference path="../schema/Trellis.d.ts" />
/// <reference path="../operations/Query.d.ts" />
/// <reference path="../operations/Update.d.ts" />
/// <reference path="../operations/Delete.d.ts" />
/// <reference path="../../defs/node.d.ts" />
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
        private sanitize_trellis_argument(trellis);
        static to_bool(input): boolean;
    }
}
