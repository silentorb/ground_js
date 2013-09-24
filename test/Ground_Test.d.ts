/// <reference path="../classes/references.d.ts" />
export declare class Fixture {
    public ground: Ground.Core;
    public test;
    constructor(db_name: string, test?);
    public prepare_database(): void;
    public insert_object(trellis, data): void;
}
