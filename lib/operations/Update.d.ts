/// <reference path="../references.d.ts" />
declare module Ground {
    class Update {
        private seed;
        private fields;
        public override: boolean;
        public trellis: Ground.Trellis;
        public main_table: string;
        public ground: Ground.Core;
        public db: Ground.Database;
        public is_service: boolean;
        static log_queries: boolean;
        constructor(trellis: Ground.Trellis, seed: Ground.ISeed, ground?: Ground.Core);
        private generate_sql(trellis);
        private create_record(trellis);
        private update_record(trellis, id, key_condition);
        private apply_insert(property, value);
        public is_create_property(property: Ground.Property): boolean;
        private get_field_value(property);
        private is_update_property(property);
        private update_links(trellis, id, create?);
        private update_many_to_many(property, id, create?);
        private update_one_to_many(property, id);
        private update_reference(property, id);
        private update_reference_object(object, property, id);
        public run(): Promise;
    }
}
