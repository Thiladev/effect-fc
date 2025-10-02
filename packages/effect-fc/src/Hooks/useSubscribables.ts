import { Effect, Equivalence, pipe, Stream, type Subscribable } from "effect"
import * as React from "react"
import { useFork } from "./useFork.js"
import { useOnce } from "./useOnce.js"


export const useSubscribables: {
    <const T extends readonly Subscribable.Subscribable<any, any, any>[]>(
        ...elements: T
    ): Effect.Effect<
        { [K in keyof T]: Effect.Effect.Success<T[K]["get"]> | Stream.Stream.Success<T[K]["changes"]> },
        Effect.Effect.Error<T[number]["get"]> | Stream.Stream.Error<T[number]["changes"]>,
        Effect.Effect.Context<T[number]["get"]> | Stream.Stream.Context<T[number]["changes"]>
    >
} = Effect.fnUntraced(function* <const T extends readonly Subscribable.Subscribable<any, any, any>[]>(
    ...elements: T
) {
    const [reactStateValue, setReactStateValue] = React.useState(yield* useOnce(() =>
        Effect.all(elements.map(v => v.get))
    ))

    yield* useFork(() => pipe(
        elements.map(ref => Stream.changesWith(ref.changes, Equivalence.strict())),
        streams => Stream.zipLatestAll(...streams),
        Stream.runForEach(v =>
            Effect.sync(() => setReactStateValue(v))
        ),
    ), elements)

    return reactStateValue as any
})
