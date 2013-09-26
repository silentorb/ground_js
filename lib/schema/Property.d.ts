/// <reference path="../references.d.ts" />
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
        public get_field_name(): string;
        public get_field_override(create_if_missing?: boolean): Ground.IField;
        public get_field_type();
        public get_field_value(value, as_service?: boolean): Promise;
        public get_other_id(entity);
        public get_other_property(create_if_none?: boolean): Property;
        public get_property_type(): Ground.Property_Type;
        public get_relationship(): Relationships;
    }
}
