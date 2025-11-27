import { type Cause, type Context, Effect, Fiber, identity, Option, Pipeable, Predicate, type Scope, Stream, type Subscribable, SubscriptionRef } from "effect"
import * as Result from "./Result.js"


export const QueryTypeId: unique symbol = Symbol.for("@effect-fc/Query/Query")
export type QueryTypeId = typeof QueryTypeId

export interface Query<in out K extends readonly any[], in out A, in out E = never, in out R = never, in out P = never>
extends Pipeable.Pipeable {
    readonly [QueryTypeId]: QueryTypeId

    readonly context: Context.Context<Scope.Scope | R>
    readonly key: Stream.Stream<K>
    readonly f: (key: K) => Effect.Effect<A, E, R>
    readonly initialProgress: P

    readonly latestKey: Subscribable.Subscribable<Option.Option<K>>
    readonly fiber: Subscribable.Subscribable<Option.Option<Fiber.Fiber<A, E>>>
    readonly result: Subscribable.Subscribable<Result.Result<A, E, P>>

    fetch(key: K): Effect.Effect<Result.Final<A, E, P>>
    fetchSubscribable(key: K): Effect.Effect<Subscribable.Subscribable<Result.Result<A, E, P>>>
    readonly refetch: Effect.Effect<Result.Final<A, E, P>, Cause.NoSuchElementException>
    readonly refetchSubscribable: Effect.Effect<Subscribable.Subscribable<Result.Result<A, E, P>>, Cause.NoSuchElementException>
    readonly refresh: Effect.Effect<Result.Final<A, E, P>, Cause.NoSuchElementException>
    readonly refreshSubscribable: Effect.Effect<Subscribable.Subscribable<Result.Result<A, E, P>>, Cause.NoSuchElementException>
}

export class QueryImpl<in out K extends readonly any[], in out A, in out E = never, in out R = never, in out P = never>
extends Pipeable.Class() implements Query<K, A, E, R, P> {
    readonly [QueryTypeId]: QueryTypeId = QueryTypeId

    constructor(
        readonly context: Context.Context<Scope.Scope | NoInfer<R>>,
        readonly key: Stream.Stream<K>,
        readonly f: (key: K) => Effect.Effect<A, E, R>,
        readonly initialProgress: P,

        readonly latestKey: SubscriptionRef.SubscriptionRef<Option.Option<K>>,
        readonly fiber: SubscriptionRef.SubscriptionRef<Option.Option<Fiber.Fiber<A, E>>>,
        readonly result: SubscriptionRef.SubscriptionRef<Result.Result<A, E, P>>,
    ) {
        super()
    }

    get interrupt(): Effect.Effect<void, never, never> {
        return Effect.andThen(this.fiber, Option.match({
            onSome: Fiber.interrupt,
            onNone: () => Effect.void,
        }))
    }

    fetch(key: K): Effect.Effect<Result.Final<A, E, P>> {
        return this.interrupt.pipe(
            Effect.andThen(SubscriptionRef.set(this.latestKey, Option.some(key))),
            Effect.andThen(Effect.provide(this.start(key), this.context)),
            Effect.andThen(sub => this.watch(sub)),
        )
    }
    fetchSubscribable(key: K): Effect.Effect<Subscribable.Subscribable<Result.Result<A, E, P>>> {
        return this.interrupt.pipe(
            Effect.andThen(SubscriptionRef.set(this.latestKey, Option.some(key))),
            Effect.andThen(Effect.provide(this.start(key), this.context)),
        )
    }
    get refetch(): Effect.Effect<Result.Final<A, E, P>, Cause.NoSuchElementException> {
        return this.interrupt.pipe(
            Effect.andThen(this.latestKey),
            Effect.andThen(identity),
            Effect.andThen(key => Effect.provide(this.start(key), this.context)),
            Effect.andThen(sub => this.watch(sub)),
        )
    }
    get refetchSubscribable(): Effect.Effect<Subscribable.Subscribable<Result.Result<A, E, P>>, Cause.NoSuchElementException> {
        return this.interrupt.pipe(
            Effect.andThen(this.latestKey),
            Effect.andThen(identity),
            Effect.andThen(key => Effect.provide(this.start(key), this.context)),
        )
    }
    get refresh(): Effect.Effect<Result.Final<A, E, P>, Cause.NoSuchElementException> {
        return this.interrupt.pipe(
            Effect.andThen(this.latestKey),
            Effect.andThen(identity),
            Effect.andThen(key => Effect.provide(this.start(key, true), this.context)),
            Effect.andThen(sub => this.watch(sub)),
        )
    }
    get refreshSubscribable(): Effect.Effect<Subscribable.Subscribable<Result.Result<A, E, P>>, Cause.NoSuchElementException> {
        return this.interrupt.pipe(
            Effect.andThen(this.latestKey),
            Effect.andThen(identity),
            Effect.andThen(key => Effect.provide(this.start(key, true), this.context)),
        )
    }

    start(
        key: K,
        refresh?: boolean,
    ): Effect.Effect<
        Subscribable.Subscribable<Result.Result<A, E, P>>,
        never,
        Scope.Scope | R
    > {
        return this.result.pipe(
            Effect.map(previous => Result.isFinal(previous)
                ? previous
                : undefined
            ),
            Effect.andThen(previous => Result.unsafeForkEffect(
                Effect.onExit(this.f(key), () => SubscriptionRef.set(this.fiber, Option.none())),
                {
                    initialProgress: this.initialProgress,
                    refresh: refresh && previous,
                    previous,
                } as Result.unsafeForkEffect.Options<A, E, P>,
            )),
            Effect.tap(([, fiber]) => SubscriptionRef.set(this.fiber, Option.some(fiber))),
            Effect.map(([sub]) => sub),
        )
    }

    watch(
        sub: Subscribable.Subscribable<Result.Result<A, E, P>>
    ): Effect.Effect<Result.Final<A, E, P>> {
        return Effect.andThen(
            sub.get,
            initial => Stream.runFoldEffect(
                Stream.filter(sub.changes, Predicate.not(Result.isInitial)),
                initial,
                (_, result) => Effect.as(SubscriptionRef.set(this.result, result), result),
            ),
        ) as Effect.Effect<Result.Final<A, E, P>>
    }
}

export const isQuery = (u: unknown): u is Query<unknown[], unknown, unknown, unknown, unknown> => Predicate.hasProperty(u, QueryTypeId)

export declare namespace make {
    export interface Options<K extends readonly any[], A, E = never, R = never, P = never> {
        readonly key: Stream.Stream<K>
        readonly f: (key: NoInfer<K>) => Effect.Effect<A, E, Result.forkEffect.InputContext<R, NoInfer<P>>>
        readonly initialProgress?: P
    }
}

export const make = Effect.fnUntraced(function* <K extends readonly any[], A, E = never, R = never, P = never>(
    options: make.Options<K, A, E, R, P>
): Effect.fn.Return<
    Query<K, A, E, Result.forkEffect.OutputContext<A, E, R, P>, P>,
    never,
    Scope.Scope | Result.forkEffect.OutputContext<A, E, R, P>
> {
    return new QueryImpl(
        yield* Effect.context<Scope.Scope | Result.forkEffect.OutputContext<A, E, R, P>>(),
        options.key,
        options.f as any,
        options.initialProgress as P,

        yield* SubscriptionRef.make(Option.none<K>()),
        yield* SubscriptionRef.make(Option.none<Fiber.Fiber<A, E>>()),
        yield* SubscriptionRef.make(Result.initial<A, E, P>()),
    )
})

export const service = <K extends readonly any[], A, E = never, R = never, P = never>(
    options: make.Options<K, A, E, R, P>
): Effect.Effect<
    Query<K, A, E, Result.forkEffect.OutputContext<A, E, R, P>, P>,
    never,
    Scope.Scope | Result.forkEffect.OutputContext<A, E, R, P>
> => Effect.tap(
    make(options),
    query => Effect.forkScoped(run(query)),
)

export const run = <K extends readonly any[], A, E, R, P>(
    self: Query<K, A, E, R, P>
): Effect.Effect<void> => {
    const _self = self as QueryImpl<K, A, E, R, P>
    return Stream.runForEach(_self.key, key => _self.interrupt.pipe(
        Effect.andThen(SubscriptionRef.set(_self.latestKey, Option.some(key))),
        Effect.andThen(_self.start(key)),
        Effect.andThen(sub => Effect.forkScoped(_self.watch(sub))),
        Effect.provide(_self.context),
    ))
}
