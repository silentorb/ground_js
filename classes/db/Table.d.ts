/// <reference path="../references.d.ts" />
/// <reference path="../../../metahub/metahub.d.ts" />
declare module Ground {
    class Table {
        public name: string;
        public properties: any[];
        public indexes: any[];
        public ground: Ground.Core;
        public db_name: string;
        public trellis: Ground.Trellis;
        public primary_keys: any[];
        constructor(name: string, ground: Ground.Core);
        public connect_trellis(trellis: Ground.Trellis): void;
        static create_from_trellis(trellis: Ground.Trellis, ground?: Ground.Core): Table;
        static create_sql_from_array(table_name: string, source: any[], primary_keys?: any[], indexes?: any[]): string;
        public create_sql_from_trellis(trellis: Ground.Trellis): string;
        static format_value(value);
        static generate_index_sql(name: string, index): string;
        public load_from_schema(source): void;
    }
}
