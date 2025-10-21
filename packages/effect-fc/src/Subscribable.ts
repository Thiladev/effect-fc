import { Effect, Equivalence, pipe, type Scope, Stream, Subscribable } from "effect"
import * as React from "react"
import * as Component from "./Component.js"


export const zipLatestAll = <const T extends readonly Subscribable.Subscribable<any, any, any>[]>(
    ...elements: T
): Subscribable.Subscribable<
    [T[number]] extends [never]
        ? never
        : { [K in keyof T]: T[K] extends Subscribable.Subscribable<infer A, infer _E, infer _R> ? A : never },
    [T[number]] extends [never] ? never : T[number] extends Subscribable.Subscribable<infer _A, infer E, infer _R> ? E : never,
    [T[number]] extends [never] ? never : T[number] extends Subscribable.Subscribable<infer _A, infer _E, infer R> ? R : never
> => Subscribable.make({
    get: Effect.all(elements.map(v => v.get)),
    changes: Stream.zipLatestAll(...elements.map(v => v.changes)),
}) as any

export const useSubscribables: {
    <const T extends readonly Subscribable.Subscribable<any, any, any>[]>(
        ...elements: T
    ): Effect.Effect<
        [T[number]] extends [never]
            ? never
            : { [K in keyof T]: T[K] extends Subscribable.Subscribable<infer A, infer _E, infer _R> ? A : never },
        [T[number]] extends [never] ? never : T[number] extends Subscribable.Subscribable<infer _A, infer E, infer _R> ? E : never,
        ([T[number]] extends [never] ? never : T[number] extends Subscribable.Subscribable<infer _A, infer _E, infer R> ? R : never) | Scope.Scope
    >
} = Effect.fnUntraced(function* <const T extends readonly Subscribable.Subscribable<any, any, any>[]>(
    ...elements: T
) {
    const [reactStateValue, setReactStateValue] = React.useState(
        yield* Component.useOnMount(() => Effect.all(elements.map(v => v.get)))
    )

    yield* Component.useOnChange(() => Effect.forkScoped(pipe(
        elements.map(ref => Stream.changesWith(ref.changes, Equivalence.strict())),
        streams => Stream.zipLatestAll(...streams),
        Stream.runForEach(v =>
            Effect.sync(() => setReactStateValue(v))
        ),
    )), elements)

    return reactStateValue as any
})

export * from "effect/Subscribable"
