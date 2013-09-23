/// <reference path="defs/deferred.d.ts" />
/// <reference path="defs/mysql.d.ts" />
/// <reference path="defs/node.d.ts" />
declare var deferred;
declare module Ground {
    class Database {
        public settings: {};
        public database: string;
        constructor(settings: {}, database: string);
        public drop_all_tables(): Promise;
        public get_tables(): Promise;
        public query(sql: string): any;
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
        public properties: Ground.Property[];
        public all_properties: Ground.Property[];
        public is_virtual: boolean;
        constructor(name: string, ground: Ground.Core);
        public add_property(name: string, source): Ground.Property;
        public get_table_name(): string;
        public load_from_object(source): void;
    }
}
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
    function extend(destination, source, names?);
    function guid(): string;
    function clone(source, names): {};
    function get_connection(a, b);
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
declare module Ground {
    class Table {
        public name: string;
        public properties: any[];
        public indexes: any[];
        public ground: Ground.Core;
        public db_name: string;
        public trellis: Ground.Trellis;
        constructor(name: string, ground: Ground.Core);
        public load_from_schema(source): void;
    }
}
declare module Ground {
    class Property {
        public name: string;
        public parent: Ground.Trellis;
        public type: string;
        public link_class;
        public is_readonly: boolean;
        public insert: string;
        public property: string;
        public default;
        public is_private: boolean;
        public is_virtual: boolean;
        constructor(name: string, source, trellis: Ground.Trellis);
    }
}
