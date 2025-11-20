import { Effect, Fiber, Option, Pipeable, Predicate, type Scope, Stream, type Subscribable, SubscriptionRef } from "effect"
import * as Result from "./Result.js"


export const QueryTypeId: unique symbol = Symbol.for("@effect-fc/Query/Query")
export type QueryTypeId = typeof QueryTypeId

export interface Query<in out K extends readonly any[], in out A, in out E = never, out R = never, in out P = never>
extends Pipeable.Pipeable {
    readonly [QueryTypeId]: QueryTypeId

    readonly key: Stream.Stream<K>
    readonly f: (key: K) => Effect.Effect<A, E, R>
    readonly initialProgress: P

    readonly fiber: Subscribable.Subscribable<Option.Option<Fiber.Fiber<A, E>>>
    readonly result: Subscribable.Subscribable<Result.Result<A, E, P>>
}

class QueryImpl<in out K extends readonly any[], in out A, in out E = never, out R = never, in out P = never>
extends Pipeable.Class() implements Query<K, A, E, R, P> {
    readonly [QueryTypeId]: QueryTypeId = QueryTypeId

    constructor(
        readonly key: Stream.Stream<K>,
        readonly f: (key: K) => Effect.Effect<A, E, R>,
        readonly initialProgress: P,

        readonly fiber: SubscriptionRef.SubscriptionRef<Option.Option<Fiber.Fiber<A, E>>>,
        readonly result: SubscriptionRef.SubscriptionRef<Result.Result<A, E, P>>,
    ) {
        super()
    }

    readonly interrupt: Effect.Effect<void, never, never> = Effect.gen(this, function*() {
        return yield* Effect.andThen(this.fiber, Option.match({
            onSome: fiber => Effect.andThen(
                Fiber.interrupt(fiber),
                SubscriptionRef.set(this.fiber, Option.none()),
            ),
            onNone: () => Effect.void,
        }))
    })

    query(key: K): Effect.Effect<Result.Result<A, E, P>, never, Scope.Scope | R> {
        return this.fiber.pipe(
            Effect.andThen(this.interrupt),
            Effect.andThen(Result.unsafeForkEffect(this.f(key), { initialProgress: this.initialProgress })),
            Effect.tap(([, fiber]) => SubscriptionRef.set(this.fiber, Option.some(fiber))),
            Effect.andThen(([sub]) => Effect.all([Effect.succeed(sub), sub.get])),
            Effect.andThen(([sub, initial]) => Stream.runFoldEffect(
                sub.changes,
                initial,
                (_, result) => Effect.as(SubscriptionRef.set(this.result, result), result),
            )),
            Effect.tap(SubscriptionRef.set(this.fiber, Option.none())),
        )
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
): Effect.fn.Return<Query<K, A, E, Result.forkEffect.OutputContext<A, E, R, P>, P>> {
    return new QueryImpl(
        options.key,
        options.f as any,
        options.initialProgress as P,

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
): Effect.Effect<void, never, Scope.Scope | R> => Stream.runForEach(self.key, key => Effect.andThen(
    (self as QueryImpl<K, A, E, R, P>).interrupt,
    Effect.forkScoped((self as QueryImpl<K, A, E, R, P>).query(key)),
))
