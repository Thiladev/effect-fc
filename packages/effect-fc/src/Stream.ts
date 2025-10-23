import { Effect, Equivalence, Option, PubSub, Ref, type Scope, Stream } from "effect"
import * as React from "react"
import * as Component from "./Component.js"


export const useStream: {
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
    const [reactStateValue, setReactStateValue] = React.useState(() => initialValue
        ? Option.some(initialValue)
        : Option.none()
    )

    yield* Component.useReactEffect(() => Effect.forkScoped(
        Stream.runForEach(
            Stream.changesWith(stream, Equivalence.strict()),
            v => Effect.sync(() => setReactStateValue(Option.some(v))),
        )
    ), [stream])

    return reactStateValue as Option.Some<A>
})

export const useStreamFromReactiveValues: {
    <const A extends React.DependencyList>(
        values: A
    ): Effect.Effect<Stream.Stream<A>, never, Scope.Scope>
} = Effect.fnUntraced(function* <const A extends React.DependencyList>(values: A) {
    const { latest, pubsub, stream } = yield* Component.useOnMount(() => Effect.Do.pipe(
        Effect.bind("latest", () => Ref.make(values)),
        Effect.bind("pubsub", () => Effect.acquireRelease(PubSub.unbounded<A>(), PubSub.shutdown)),
        Effect.let("stream", ({ latest, pubsub }) => latest.pipe(
            Effect.flatMap(a => Effect.map(
                Stream.fromPubSub(pubsub, { scoped: true }),
                s => Stream.concat(Stream.make(a), s),
            )),
            Stream.unwrapScoped,
        )),
    ))

    yield* Component.useReactEffect(() => Ref.set(latest, values).pipe(
        Effect.andThen(PubSub.publish(pubsub, values)),
        Effect.unlessEffect(PubSub.isShutdown(pubsub)),
    ), values)

    return stream
})

export * from "effect/Stream"
