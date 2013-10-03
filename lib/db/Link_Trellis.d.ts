/// <reference path="../references.d.ts" />
declare module Ground {
    class Link_Trellis {
        public table_name: string;
        public property: Ground.Property;
        public args;
        public first_property: Ground.Property;
        public second_property: Ground.Property;
        public id_suffix: string;
        constructor(property: Ground.Property);
        public generate_join(id, reverse?: boolean): string;
        public get_arguments(property): {
            '%first_id': any;
            '%second_id': any;
            '%back_id': any;
            '%forward_id': any;
        };
        static populate_sql(sql: string, args): string;
    }
}
