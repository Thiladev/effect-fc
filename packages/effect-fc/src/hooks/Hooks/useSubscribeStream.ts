import { Effect, Equivalence, Option, Stream } from "effect"
import * as React from "react"
import { useFork } from "./useFork.js"


export const useSubscribeStream: {
    <A, E, R>(
        stream: Stream.Stream<A, E, R>
    ): Effect.Effect<Option.Option<A>, never, R>
    <A extends NonNullable<unknown>, E, R>(
        stream: Stream.Stream<A, E, R>,
        initialValue: A,
    ): Effect.Effect<Option.Some<A>, never, R>
} = Effect.fnUntraced(function* <A extends NonNullable<unknown>, E, R>(
    stream: Stream.Stream<A, E, R>,
    initialValue?: A,
) {
    const [reactStateValue, setReactStateValue] = React.useState(
        React.useMemo(() => initialValue
            ? Option.some(initialValue)
            : Option.none(),
        [])
    )

    yield* useFork(() => Stream.runForEach(
        Stream.changesWith(stream, Equivalence.strict()),
        v => Effect.sync(() => setReactStateValue(Option.some(v))),
    ), [stream])

    return reactStateValue as Option.Some<A>
})
