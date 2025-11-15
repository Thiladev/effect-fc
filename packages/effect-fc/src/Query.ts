import { type Effect, Pipeable, Predicate, type Stream } from "effect"


export const QueryTypeId: unique symbol = Symbol.for("@effect-fc/Query/Query")
export type QueryTypeId = typeof QueryTypeId

export interface Query<in out K extends readonly any[], in out A, in out E = never, out R = never, in out P = never>
extends Pipeable.Pipeable {
    readonly [QueryTypeId]: QueryTypeId

    readonly key: Stream.Stream<K>
    readonly query: (key: K) => Effect.Effect<A, E, R>
    readonly initialProgress: P
}

class QueryImpl<in out K extends readonly any[], in out A, in out E = never, out R = never, in out P = never>
extends Pipeable.Class() implements Query<K, A, E, R, P> {
    readonly [QueryTypeId]: QueryTypeId = QueryTypeId

    constructor(
        readonly key: Stream.Stream<K>,
        readonly query: (key: K) => Effect.Effect<A, E, R>,
        readonly initialProgress: P,
    ) {
        super()
    }
}

export const isQuery = (u: unknown): u is Query<unknown[], unknown, unknown, unknown, unknown> => Predicate.hasProperty(u, QueryTypeId)
