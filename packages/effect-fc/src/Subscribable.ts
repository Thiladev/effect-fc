import { Effect, Stream, Subscribable } from "effect"


export const zipLatestAll = <T extends ReadonlyArray<Subscribable.Subscribable<any, any, any>>>(
    ...subscribables: T
): Subscribable.Subscribable<
    [T[number]] extends [never]
        ? never
        : { [K in keyof T]: T[K] extends Subscribable.Subscribable<infer A, infer _E, infer _R> ? A : never },
    [T[number]] extends [never] ? never : T[number] extends Subscribable.Subscribable<infer _A, infer _E, infer _R> ? _E : never,
    [T[number]] extends [never] ? never : T[number] extends Subscribable.Subscribable<infer _A, infer _E, infer _R> ? _R : never
> => Subscribable.make({
    get: Effect.all(subscribables.map(v => v.get)),
    changes: Stream.zipLatestAll(...subscribables.map(v => v.changes)),
}) as any

export * from "effect/Subscribable"
