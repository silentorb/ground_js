/// <reference path="references.d.ts" />
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
        public check_primary_key(): void;
        public clone_property(property_name: string, target_trellis: Trellis): void;
        public get_core_properties(): Ground.Property[];
        public get_table_name(): string;
        public load_from_object(source): void;
        public set_parent(parent: Trellis): void;
    }
}
