// Type definitions for linq.js 2.2
// Project: http://linqjs.codeplex.com/
// Definitions by: Marcin Najder
// Definitions: https://github.com/borisyankov/DefinitelyTyped

// todo: jQuery plugin, RxJS Binding


    interface EnumerableStatic<T> {
        Choice(...contents: any[]): Enumerable<T>;
        Choice(contents: any[]): Enumerable<T>;
        Cycle(...contents: any[]): Enumerable<T>;
        Cycle(contents: any[]): Enumerable<T>;
        Empty(): Enumerable<T>;
        From(obj: any[]): Enumerable<T>;
        From(obj: any): Enumerable<T>;
        Return(element: any): Enumerable<T>;
        Matches(input: string, pattern: RegExp): Enumerable<T>;
        Matches(input: string, pattern: string, flags?: string): Enumerable<T>;
        Range(start: number, count: number, step?: number): Enumerable<T>;
        RangeDown(start: number, count: number, step?: number): Enumerable<T>;
        RangeTo(start: number, to: number, step?: number): Enumerable<T>;
        Repeat(obj: any, count?: number): Enumerable<T>;
        RepeatWithFinalize(initializer: () => any, finalizer: (resource: any) =>void ): Enumerable<T>;
        Generate(func: () => any, count?: number): Enumerable<T>;
        Generate(func: string, count?: number): Enumerable<T>;
        ToInfinity(start?: number, step?: number): Enumerable<T>;
        ToNegativeInfinity(start?: number, step?: number): Enumerable<T>;
        Unfold(seed, func: ($) => any): Enumerable<T>;
        Unfold(seed, func: string): Enumerable<T>;
    }

    interface Enumerable<T> {
        //Projection and Filtering Methods
        CascadeBreadthFirst(func: ($) => any[], resultSelector: (v, i: number) => any): Enumerable<T>;
        CascadeBreadthFirst(func: string, resultSelector: string): Enumerable<T>;
        CascadeDepthFirst(func: ($) => any[], resultSelector: (v, i: number) => any): Enumerable<T>;
        CascadeDepthFirst(func: string, resultSelector: string): Enumerable<T>;
        Flatten(...items: any[]): Enumerable<T>;
        Pairwise(selector: (prev, next) => any): Enumerable<T>;
        Pairwise(selector: string): Enumerable<T>;
        Scan(func: (a, b) => any): Enumerable<T>;
        Scan(func: string): Enumerable<T>;
        Scan(seed, func: (a, b) => any, resultSelector?: ($) => any): Enumerable<T>;
        Scan(seed, func: string, resultSelector?: string): Enumerable<T>;
        Select(selector: ($, i: number) => any): Enumerable<T>;
        Select(selector: string): Enumerable<T>;
        SelectMany(collectionSelector: ($, i: number) => any[], resultSelector?: ($, item) => any): Enumerable<T>;
        SelectMany(collectionSelector: ($, i: number) => Enumerable<T>, resultSelector?: ($, item) => any): Enumerable<T>;
        SelectMany(collectionSelector: string, resultSelector?: string): Enumerable<T>;
        Where(predicate: ($, i: number) => boolean): Enumerable<T>;
        Where(predicate: string): Enumerable<T>;
        OfType(type: Function): Enumerable<T>;
        Zip(second: any[], selector: (v1, v2, i: number) => any): Enumerable<T>;
        Zip(second: any[], selector: string): Enumerable<T>;
        Zip(second: Enumerable<T>, selector: (v1, v2, i: number) => any): Enumerable<T>;
        Zip(second: Enumerable<T>, selector: string): Enumerable<T>;
        //Join Methods
        Join(inner: any[], outerKeySelector: (v1) => any, innerKeySelector: (v1) => any, resultSelector: (v1, v2) => any, compareSelector?: (v) => any): Enumerable<T>;
        Join(inner: any[], outerKeySelector: string, innerKeySelector: string, resultSelector: string, compareSelector?: string): Enumerable<T>;
        Join(inner: Enumerable<T>, outerKeySelector: (v1) => any, innerKeySelector: (v1) => any, resultSelector: (v1, v2) => any, compareSelector?: (v) => any): Enumerable<T>;
        Join(inner: Enumerable<T>, outerKeySelector: string, innerKeySelector: string, resultSelector: string, compareSelector?: string): Enumerable<T>;
        GroupJoin(inner: any[], outerKeySelector: (v1) => any, innerKeySelector: (v1) => any, resultSelector: (v1, v2: Enumerable<T>) => any, compareSelector?: (v) => any): Enumerable<T>;
        GroupJoin(inner: any[], outerKeySelector: string, innerKeySelector: string, resultSelector: string, compareSelector?: string): Enumerable<T>;
        GroupJoin(inner: Enumerable<T>, outerKeySelector: (v1) => any, innerKeySelector: (v1) => any, resultSelector: (v1, v2: Enumerable<T>) => any, compareSelector?: (v) => any): Enumerable<T>;
        GroupJoin(inner: Enumerable<T>, outerKeySelector: string, innerKeySelector: string, resultSelector: string, compareSelector?: string): Enumerable<T>;
        //Set Methods
        All(predicate: ($) => boolean): boolean;
        All(predicate: string): boolean;
        Any(predicate?: ($) => boolean): boolean;
        Any(predicate?: string): boolean;
        Concat(second: any[]): Enumerable<T>;
        Concat(second: Enumerable<T>): Enumerable<T>;
        Insert(index: number, second: any[]): Enumerable<T>;
        Insert(index: number, second: Enumerable<T>): Enumerable<T>;
        Alternate(value): Enumerable<T>;
        Contains(value, compareSelector?: ($) => any): boolean;
        Contains(value, compareSelector?: string): boolean;
        DefaultIfEmpty(defaultValue): Enumerable<T>;
        Distinct(compareSelector?: ($) => any): Enumerable<T>;
        Distinct(compareSelector?: string): Enumerable<T>;
        Except(second: any[], compareSelector?: ($) => any): Enumerable<T>;
        Except(second: any[], compareSelector?: string): Enumerable<T>;
        Except(second: Enumerable<T>, compareSelector?: ($) => any): Enumerable<T>;
        Except(second: Enumerable<T>, compareSelector?: string): Enumerable<T>;
        Intersect(second: any[], compareSelector?: ($) => any): Enumerable<T>;
        Intersect(second: any[], compareSelector?: string): Enumerable<T>;
        Intersect(second: Enumerable<T>, compareSelector?: ($) => any): Enumerable<T>;
        Intersect(second: Enumerable<T>, compareSelector?: string): Enumerable<T>;
        SequenceEqual(second: any[], compareSelector?: ($) => any): boolean;
        SequenceEqual(second: any[], compareSelector?: string): boolean;
        SequenceEqual(second: Enumerable<T>, compareSelector?: ($) => any): boolean;
        SequenceEqual(second: Enumerable<T>, compareSelector?: string): boolean;
        Union(second: any[], compareSelector?: ($) => any): Enumerable<T>;
        Union(second: any[], compareSelector?: string): Enumerable<T>;
        Union(second: Enumerable<T>, compareSelector?: ($) => any): Enumerable<T>;
        Union(second: Enumerable<T>, compareSelector?: string): Enumerable<T>;
        //Ordering Methods
        OrderBy(keySelector?: ($) => any): OrderedEnumerable<T>;
        OrderBy(keySelector?: string): OrderedEnumerable<T>;
        OrderByDescending(keySelector?: ($) => any): OrderedEnumerable<T>;
        OrderByDescending(keySelector?: string): OrderedEnumerable<T>;
        Reverse(): Enumerable<T>;
        Shuffle(): Enumerable<T>;
        //Grouping Methods
        GroupBy(keySelector: ($) => any, elementSelector?: ($) => any, resultSelector?: (key, e) => any, compareSelector?: ($) =>any): Enumerable<T>;
        GroupBy(keySelector: string, elementSelector?: string, resultSelector?: string, compareSelector?: string): Enumerable<T>;
        PartitionBy(keySelector: ($) => any, elementSelector?: ($) => any, resultSelector?: (key, e) => any, compareSelector?: ($) =>any): Enumerable<T>;
        PartitionBy(keySelector: string, elementSelector?: string, resultSelector?: string, compareSelector?: string): Enumerable<T>;
        BufferWithCount(count: number): Enumerable<T>;
        // Aggregate Methods
        Aggregate(func: (a, b) => any);
        Aggregate(seed, func: (a, b) => any, resultSelector?: ($) => any);
        Aggregate(func: string);
        Aggregate(seed, func: string, resultSelector?: string);
        Average(selector?: ($) => number): number;
        Average(selector?: string): number;
        Count(predicate?: ($) => boolean): number;
        Count(predicate?: string): number;
        Max(selector?: ($) => number): number;
        Max(selector?: string): number;
        Min(selector?: ($) => number): number;
        Min(selector?: string): number;
        MaxBy(selector: ($) => number): any;
        MaxBy(selector: string): any;
        MinBy(selector: ($) => number): any;
        MinBy(selector: string): any;
        Sum(selector?: ($) => number): number;
        Sum(selector?: string): number;
        //Paging Methods
        ElementAt(index: number): any;
        ElementAtOrDefault(index: number, defaultValue): any;
        First(predicate?: ($) => boolean): any;
        First(predicate?: string): any;
        FirstOrDefault(defaultValue, predicate?: ($) => boolean): any;
        FirstOrDefault(defaultValue, predicate?: string): any;
        Last(predicate?: ($) => boolean): any;
        Last(predicate?: string): any;
        LastOrDefault(defaultValue, predicate?: ($) => boolean): any;
        LastOrDefault(defaultValue, predicate?: string): any;
        Single(predicate?: ($) => boolean): any;
        Single(predicate?: string): any;
        SingleOrDefault(defaultValue, predicate?: ($) => boolean): any;
        SingleOrDefault(defaultValue, predicate?: string): any;
        Skip(count: number): Enumerable<T>;
        SkipWhile(predicate: ($, i: number) => boolean): Enumerable<T>;
        SkipWhile(predicate: string): Enumerable<T>;
        Take(count: number): Enumerable<T>;
        TakeWhile(predicate: ($, i: number) => boolean): Enumerable<T>;
        TakeWhile(predicate: string): Enumerable<T>;
        TakeExceptLast(count?: number): Enumerable<T>;
        TakeFromLast(count: number): Enumerable<T>;
        IndexOf(item): number;
        LastIndexOf(item): number;
        // Convert Methods
        ToArray(): any[];
        ToLookup(keySelector: ($) => any, elementSelector?: ($) => any, compareSelector?: (key) => any): Lookup<T>;
        ToLookup(keySelector: string, elementSelector?: string, compareSelector?: string): Lookup<T>;
        ToObject(keySelector: ($) => string, elementSelector: ($) => any): any;
        ToObject(keySelector: string, elementSelector: string): any;
        ToDictionary(keySelector: ($) => any, elementSelector: ($) => any, compareSelector?: (key) => any): Dictionary<T>;
        ToDictionary(keySelector: string, elementSelector: string, compareSelector?: string): Dictionary<T>;
        ToJSON(replacer?: (key, value) => any, space?: number): string;
        ToJSON(replacer?: string, space?: number): string;
        ToString(separator?: string, selector?: ($) =>any): string;
        ToString(separator?: string, selector?: string): string;
        //Action Methods
        Do(action: ($, i: number) => void ): Enumerable<T>;
        Do(action: string): Enumerable<T>;
        ForEach(action: ($, i: number) => void ): void;
        ForEach(func: ($, i: number) => boolean): void;
        ForEach(action_func: string): void;
        Write(separator?: string, selector?: ($) =>any): void;
        Write(separator?: string, selector?: string): void;
        WriteLine(selector?: ($) =>any): void;
        Force(): void;
        //Functional Methods
        Let(func: (e: Enumerable<T>) => Enumerable<T>): Enumerable<T>;
        Share(): Enumerable<T>;
        MemoizeAll(): Enumerable<T>;
        //Error Handling Methods
        Catch(handler: (error: Error) => void ): Enumerable<T>;
        Catch(handler: string): Enumerable<T>;
        Finally(finallyAction: () => void ): Enumerable<T>;
        Finally(finallyAction: string): Enumerable<T>;
        //For Debug Methods
        Trace(message?: string, selector?: ($) =>any): Enumerable<T>;
        Trace(message?: string, selector?: string): Enumerable<T>;
    }

    interface OrderedEnumerable<T> extends Enumerable<T> {
        ThenBy(keySelector: ($) => any): OrderedEnumerable<T>;
        ThenBy(keySelector: string): OrderedEnumerable<T>;
        ThenByDescending(keySelector: ($) => any): OrderedEnumerable<T>;
        ThenByDescending(keySelector: string): OrderedEnumerable<T>;
    }

    interface Grouping<T> extends Enumerable<T> {
        Key();
    }

    interface Lookup<T> {
        Count(): number;
        Get(key): Enumerable<T>;
        Contains(key): boolean;
        ToEnumerable(): Enumerable<T>;
    }

    interface Dictionary<T> {
        Add(key, value): void;
        Get(key): any;
        Set(key, value): boolean;
        Contains(key): boolean;
        Clear(): void;
        Remove(key): void;
        Count(): number;
        ToEnumerable(): Enumerable<T>;
    }

//declare var Enumerable: linq.EnumerableStatic;

