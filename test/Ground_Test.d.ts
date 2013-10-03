/// <reference path="../lib/references.d.ts" />
export declare class Fixture {
    public ground: Ground.Core;
    public test;
    constructor(db_name: string, test?);
    public load_schema(): void;
    public prepare_database(): Promise;
    public populate(): Promise;
    public insert_object(trellis, data): Promise;
}
export declare class Test {
    public fixture: Fixture;
    public ground: Ground.Core;
    public timeout: number;
    public db: Ground.Database;
}
export declare function setup(test): void;
