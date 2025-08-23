import { type Effect, Effectable, Readable, type Stream, Subscribable } from "effect"


class SubscribableImpl<A, E, R>
extends Effectable.Class<A, E, R> implements Subscribable.Subscribable<A, E, R> {
    readonly [Readable.TypeId]: Readable.TypeId = Readable.TypeId
    readonly [Subscribable.TypeId]: Subscribable.TypeId = Subscribable.TypeId

    constructor(
        readonly get: Effect.Effect<A, E, R>,
        readonly changes: Stream.Stream<A, E, R>,
    ) {
        super()
    }

    commit() {
        return this.get
    }
}

export const make = <A, E, R>(values: {
    readonly get: Effect.Effect<A, E, R>
    readonly changes: Stream.Stream<A, E, R>
}): Subscribable.Subscribable<A, E, R> => new SubscribableImpl(values.get, values.changes)
