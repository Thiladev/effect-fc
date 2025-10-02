import { Effect, PubSub, Ref, type Scope, Stream } from "effect"
import type * as React from "react"
import { useEffect } from "./useEffect.js"
import { useOnce } from "./useOnce.js"


export const useStreamFromReactiveValues: {
    <const A extends React.DependencyList>(
        values: A
    ): Effect.Effect<Stream.Stream<A>, never, Scope.Scope>
} = Effect.fnUntraced(function* <const A extends React.DependencyList>(values: A) {
    const { latest, pubsub, stream } = yield* useOnce(() => Effect.Do.pipe(
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

    yield* useEffect(() => Ref.set(latest, values).pipe(
        Effect.andThen(PubSub.publish(pubsub, values)),
        Effect.unlessEffect(PubSub.isShutdown(pubsub)),
    ), values)

    return stream
})
