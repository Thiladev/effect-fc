import { type Cause, Context, Effect, Layer, Option, Pipeable, Predicate, PubSub, type Queue, type Scope } from "effect"


export const TypeId: unique symbol = Symbol.for("@effect-fc/ErrorObserver/ErrorObserver")
export type TypeId = typeof TypeId

export interface ErrorObserver<in out E = never> extends Pipeable.Pipeable {
    readonly [TypeId]: TypeId
    handle<A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R>
    readonly subscribe: Effect.Effect<Queue.Dequeue<Cause.Cause<E>>, never, Scope.Scope>
}

export const ErrorObserver = <E = never>(): Context.Tag<ErrorObserver, ErrorObserver<E>> => Context.GenericTag("@effect-fc/ErrorObserver/ErrorObserver")

class ErrorObserverImpl<in out E = never>
extends Pipeable.Class() implements ErrorObserver<E> {
    readonly [TypeId]: TypeId = TypeId
    readonly subscribe: Effect.Effect<Queue.Dequeue<Cause.Cause<E>>, never, Scope.Scope>

    constructor(
        private readonly pubsub: PubSub.PubSub<Cause.Cause<E>>
    ) {
        super()
        this.subscribe = pubsub.subscribe
    }

    handle<A, EffE, R>(effect: Effect.Effect<A, EffE, R>): Effect.Effect<A, EffE, R> {
        return Effect.tapErrorCause(effect, cause => PubSub.publish(this.pubsub, cause as Cause.Cause<E>))
    }
}


export const isErrorObserver = (u: unknown): u is ErrorObserver<unknown> => Predicate.hasProperty(u, TypeId)

export const layer: Layer.Layer<ErrorObserver> = Layer.effect(ErrorObserver(), Effect.andThen(
    PubSub.unbounded<Cause.Cause<never>>(),
    pubsub => new ErrorObserverImpl(pubsub),
))

export const handle = <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> => Effect.andThen(
    Effect.serviceOption(ErrorObserver()),
    Option.match({
        onSome: observer => observer.handle(effect),
        onNone: () => effect,
    }),
)
