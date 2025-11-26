import { type Context, Effect, Equal, type Fiber, Option, Pipeable, Predicate, type Scope, Stream, type Subscribable, SubscriptionRef } from "effect"
import * as Result from "./Result.js"


export const MutationTypeId: unique symbol = Symbol.for("@effect-fc/Mutation/Mutation")
export type MutationTypeId = typeof MutationTypeId

export interface Mutation<in out K extends readonly any[], in out A, in out E = never, in out R = never, in out P = never>
extends Pipeable.Pipeable {
    readonly [MutationTypeId]: MutationTypeId

    readonly context: Context.Context<Scope.Scope | R>
    readonly f: (key: K) => Effect.Effect<A, E, R>
    readonly initialProgress: P

    readonly latestKey: Subscribable.Subscribable<Option.Option<K>>
    readonly fiber: Subscribable.Subscribable<Option.Option<Fiber.Fiber<A, E>>>
    readonly result: Subscribable.Subscribable<Result.Result<A, E, P>>

    mutate(key: K): Effect.Effect<Result.Result<A, E, P>>
    mutateSubscribable(key: K): Effect.Effect<Subscribable.Subscribable<Result.Result<A, E, P>>>
}

export class MutationImpl<in out K extends readonly any[], in out A, in out E = never, in out R = never, in out P = never>
extends Pipeable.Class() implements Mutation<K, A, E, R, P> {
    readonly [MutationTypeId]: MutationTypeId = MutationTypeId

    constructor(
        readonly context: Context.Context<Scope.Scope | NoInfer<R>>,
        readonly f: (key: K) => Effect.Effect<A, E, R>,
        readonly initialProgress: P,

        readonly latestKey: SubscriptionRef.SubscriptionRef<Option.Option<K>>,
        readonly fiber: SubscriptionRef.SubscriptionRef<Option.Option<Fiber.Fiber<A, E>>>,
        readonly result: SubscriptionRef.SubscriptionRef<Result.Result<A, E, P>>,
    ) {
        super()
    }

    mutate(key: K): Effect.Effect<Result.Result<A, E, P>> {
        return SubscriptionRef.set(this.latestKey, Option.some(key)).pipe(
            Effect.andThen(Effect.provide(this.start(key), this.context)),
            Effect.andThen(sub => this.watch(sub)),
        )
    }

    mutateSubscribable(key: K): Effect.Effect<Subscribable.Subscribable<Result.Result<A, E, P>>> {
        return Effect.andThen(
            SubscriptionRef.set(this.latestKey, Option.some(key)),
            Effect.provide(this.start(key), this.context)
        )
    }

    start(key: K): Effect.Effect<
        Subscribable.Subscribable<Result.Result<A, E, P>>,
        never,
        Scope.Scope | R
    > {
        return this.result.pipe(
            Effect.map(previous => (Result.isSuccess(previous) || Result.isFailure(previous))
                ? previous
                : undefined
            ),
            Effect.andThen(previous => Result.unsafeForkEffect(
                Effect.onExit(this.f(key), () => Effect.andThen(
                    Effect.all([Effect.fiberId, this.fiber]),
                    ([currentFiberId, fiber]) => Option.match(fiber, {
                        onSome: v => Equal.equals(currentFiberId, v.id())
                            ? SubscriptionRef.set(this.fiber, Option.none())
                            : Effect.void,
                        onNone: () => Effect.void,
                    })
                )),

                {
                    initialProgress: this.initialProgress,
                    previous,
                } as Result.unsafeForkEffect.Options<A, E, P>,
            )),
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
                Stream.filter(sub.changes, Predicate.not(Result.isInitial)),
                initial,
                (_, result) => Effect.as(SubscriptionRef.set(this.result, result), result),
            ),
        )
    }
}

export const isMutation = (u: unknown): u is Mutation<unknown[], unknown, unknown, unknown, unknown> => Predicate.hasProperty(u, MutationTypeId)

export declare namespace make {
    export interface Options<K extends readonly any[], A, E = never, R = never, P = never> {
        readonly f: (key: NoInfer<K>) => Effect.Effect<A, E, Result.forkEffect.InputContext<R, NoInfer<P>>>
        readonly initialProgress?: P
    }
}

export const make = Effect.fnUntraced(function* <K extends readonly any[], A, E = never, R = never, P = never>(
    options: make.Options<K, A, E, R, P>
): Effect.fn.Return<
    Mutation<K, A, E, Result.forkEffect.OutputContext<A, E, R, P>, P>,
    never,
    Scope.Scope | Result.forkEffect.OutputContext<A, E, R, P>
> {
    return new MutationImpl(
        yield* Effect.context<Scope.Scope | Result.forkEffect.OutputContext<A, E, R, P>>(),
        options.f as any,
        options.initialProgress as P,

        yield* SubscriptionRef.make(Option.none<K>()),
        yield* SubscriptionRef.make(Option.none<Fiber.Fiber<A, E>>()),
        yield* SubscriptionRef.make(Result.initial<A, E, P>()),
    )
})
