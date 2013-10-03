/// <reference path="../references.d.ts" />
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
