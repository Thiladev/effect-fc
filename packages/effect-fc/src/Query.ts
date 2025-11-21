import { Console, Effect, Fiber, Option, Pipeable, Predicate, type Scope, Stream, type Subscribable, SubscriptionRef } from "effect"
import * as Result from "./Result.js"


export const QueryTypeId: unique symbol = Symbol.for("@effect-fc/Query/Query")
export type QueryTypeId = typeof QueryTypeId

export interface Query<in out K extends readonly any[], in out A, in out E = never, out R = never, in out P = never>
extends Pipeable.Pipeable {
    readonly [QueryTypeId]: QueryTypeId

    readonly key: Stream.Stream<K>
    readonly f: (key: K) => Effect.Effect<A, E, R>
    readonly initialProgress: P

    readonly latestKey: Subscribable.Subscribable<Option.Option<K>>
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

        readonly latestKey: SubscriptionRef.SubscriptionRef<Option.Option<K>>,
        readonly fiber: SubscriptionRef.SubscriptionRef<Option.Option<Fiber.Fiber<A, E>>>,
        readonly result: SubscriptionRef.SubscriptionRef<Result.Result<A, E, P>>,
    ) {
        super()
    }

    readonly interrupt: Effect.Effect<void, never, never> = Effect.gen(this, function*() {
        yield* Console.log("interrupt called")
        return Option.match(yield* this.fiber, {
            onSome: fiber => Effect.gen(function*() {
                yield* Console.log("interrupting...")
                yield* Fiber.interrupt(fiber)
                yield* Console.log("done interrupting.")
            }),
            onNone: () => Effect.void,
        })
    })

    start(key: K): Effect.Effect<
        Subscribable.Subscribable<Result.Result<A, E, P>>,
        never,
        Scope.Scope | R
    > {
        return Result.unsafeForkEffect(
            Effect.onExit(this.f(key), exit => SubscriptionRef.set(this.fiber, Option.none()).pipe(
                Effect.andThen(Console.log("exited", exit))
            )),
            { initialProgress: this.initialProgress },
        ).pipe(
            Effect.tap(([, fiber]) => SubscriptionRef.set(this.fiber, Option.some(fiber))),
            Effect.map(([sub]) => sub),
        )
    }

    watch(
        sub: Subscribable.Subscribable<Result.Result<A, E, P>>
    ): Effect.Effect<Result.Result<A, E, P>> {
        return Effect.andThen(
            sub.get,
            initial => Stream.runFoldEffect(
                sub.changes,
                initial,
                (_, result) => Effect.as(SubscriptionRef.set(this.result, result), result),
            ),
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
): Effect.Effect<void, never, Scope.Scope | R> => Stream.runForEach(self.key, key =>
    (self as QueryImpl<K, A, E, R, P>).interrupt.pipe(
        Effect.andThen(SubscriptionRef.set((self as QueryImpl<K, A, E, R, P>).latestKey, Option.some(key))),
        Effect.andThen((self as QueryImpl<K, A, E, R, P>).start(key)),
        Effect.andThen(sub => Effect.forkScoped(
            (self as QueryImpl<K, A, E, R, P>).watch(sub)
        )),
    )
)
