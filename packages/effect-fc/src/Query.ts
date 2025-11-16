import { Effect, Fiber, Option, Pipeable, Predicate, Stream, type Subscribable, type SubscriptionRef } from "effect"
import type * as Result from "./Result.js"


export const QueryTypeId: unique symbol = Symbol.for("@effect-fc/Query/Query")
export type QueryTypeId = typeof QueryTypeId

export interface Query<in out K extends readonly any[], in out A, in out E = never, out R = never, in out P = never>
extends Pipeable.Pipeable {
    readonly [QueryTypeId]: QueryTypeId

    readonly key: Stream.Stream<K>
    readonly f: (key: K) => Effect.Effect<A, E, R>
    readonly initialProgress: P

    readonly fiber: Subscribable.Subscribable<Option.Option<Fiber.Fiber<Result.Result<A, E, P>>>>
    readonly result: Subscribable.Subscribable<Result.Result<A, E, P>>
}

class QueryImpl<in out K extends readonly any[], in out A, in out E = never, out R = never, in out P = never>
extends Pipeable.Class() implements Query<K, A, E, R, P> {
    readonly [QueryTypeId]: QueryTypeId = QueryTypeId

    constructor(
        readonly key: Stream.Stream<K>,
        readonly f: (key: K) => Effect.Effect<A, E, R>,
        readonly initialProgress: P,

        readonly fiber: SubscriptionRef.SubscriptionRef<Option.Option<Fiber.Fiber<Result.Result<A, E, P>>>>,
        readonly result: SubscriptionRef.SubscriptionRef<Result.Result<A, E, P>>,
    ) {
        super()
    }

    query(key: K) {
        return this.result.pipe(
            Effect.andThen(Option.match({

            }))
        )
    }
}

export const isQuery = (u: unknown): u is Query<unknown[], unknown, unknown, unknown, unknown> => Predicate.hasProperty(u, QueryTypeId)

export const run = <K extends readonly any[], A, E, R, P>(
    self: Query<K, A, E, R, P>
) => Stream.runForEach(self.key,
)

export const query = <K extends readonly any[], A, E, R, P>(
    self: Query<K, A, E, R, P>,
    key: K,
) => self.fiberRef.pipe(
    Effect.andThen(Option.match({
        onSome: Fiber.interrupt,
        onNone: () => Effect.void,
    })),
    Effect.andThen(Effect.forkScoped(

    ))
)
