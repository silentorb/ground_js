/// <reference path="references.d.ts" />
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
        public get_field_name(): string;
        public get_field_override(create_if_missing?: boolean);
        public get_field_type();
        public get_property_type();
    }
}
