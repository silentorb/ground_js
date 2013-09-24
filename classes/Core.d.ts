/// <reference path="require.d.ts" />
/// <reference path="references.d.ts" />
/// <reference path="db/Database.d.ts" />
/// <reference path="Trellis.d.ts" />
/// <reference path="../defs/node.d.ts" />
declare module Ground {
    class Property_Type {
        public name: string;
        public property_class;
        public field_type;
        public default_value;
        public parent: Property_Type;
        public db: Ground.Database;
        constructor(name: string, info, types: Property_Type[]);
    }
    class Core {
        public trellises: Ground.Trellis[];
        public tables: Ground.Table[];
        public views: any[];
        public property_types: Property_Type[];
        public db: Ground.Database;
        public expansions: any[];
        constructor(config, db_name: string);
        public add_trellis(name: string, object, initialize_parent?: boolean): Ground.Trellis;
        public initialize_trellises(subset: Ground.Trellis[], all?): void;
        static load_json_from_file(filename: string): void;
        public load_schema_from_file(filename: string): void;
        public parse_schema(data): void;
        public load_property_types(filename: string): void;
        public load_tables(tables: any[]): void;
        public load_trellises(trellises: Ground.Trellis[]): void;
    }
}
