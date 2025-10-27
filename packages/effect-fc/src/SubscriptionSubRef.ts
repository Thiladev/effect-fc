import { Chunk, Effect, Effectable, Option, Predicate, Readable, Ref, Stream, Subscribable, SubscriptionRef, SynchronizedRef, type Types, type Unify } from "effect"
import * as PropertyPath from "./PropertyPath.js"


export const SubscriptionSubRefTypeId: unique symbol = Symbol.for("@effect-fc/SubscriptionSubRef/SubscriptionSubRef")
export type SubscriptionSubRefTypeId = typeof SubscriptionSubRefTypeId

export interface SubscriptionSubRef<in out A, in out B extends SubscriptionRef.SubscriptionRef<any>>
extends SubscriptionSubRef.Variance<A, B>, SubscriptionRef.SubscriptionRef<A> {
    readonly parent: B

    readonly [Unify.typeSymbol]?: unknown
    readonly [Unify.unifySymbol]?: SubscriptionSubRefUnify<this>
    readonly [Unify.ignoreSymbol]?: SubscriptionSubRefUnifyIgnore
}

export declare namespace SubscriptionSubRef {
    export interface Variance<in out A, in out B> {
        readonly [SubscriptionSubRefTypeId]: {
            readonly _A: Types.Invariant<A>
            readonly _B: Types.Invariant<B>
        }
    }
}

export interface SubscriptionSubRefUnify<A extends { [Unify.typeSymbol]?: any }> extends SubscriptionRef.SubscriptionRefUnify<A> {
    SubscriptionSubRef?: () => Extract<A[Unify.typeSymbol], SubscriptionSubRef<any, any>>
}

export interface SubscriptionSubRefUnifyIgnore extends SubscriptionRef.SubscriptionRefUnifyIgnore {
    SubscriptionRef?: true
}


const refVariance = { _A: (_: any) => _ }
const synchronizedRefVariance = { _A: (_: any) => _ }
const subscriptionRefVariance = { _A: (_: any) => _ }
const subscriptionSubRefVariance = { _A: (_: any) => _, _B: (_: any) => _ }

class SubscriptionSubRefImpl<in out A, in out B extends SubscriptionRef.SubscriptionRef<any>>
extends Effectable.Class<A> implements SubscriptionSubRef<A, B> {
    readonly [Readable.TypeId]: Readable.TypeId = Readable.TypeId
    readonly [Subscribable.TypeId]: Subscribable.TypeId = Subscribable.TypeId
    readonly [Ref.RefTypeId] = refVariance
    readonly [SynchronizedRef.SynchronizedRefTypeId] = synchronizedRefVariance
    readonly [SubscriptionRef.SubscriptionRefTypeId] = subscriptionRefVariance
    readonly [SubscriptionSubRefTypeId] = subscriptionSubRefVariance

    readonly get: Effect.Effect<A>

    constructor(
        readonly parent: B,
        readonly getter: (parentValue: Effect.Effect.Success<B>) => A,
        readonly setter: (parentValue: Effect.Effect.Success<B>, value: A) => Effect.Effect.Success<B>,
    ) {
        super()
        this.get = Effect.map(this.parent, this.getter)
    }

    commit() {
        return this.get
    }

    get changes(): Stream.Stream<A> {
        return Stream.unwrap(
            Effect.map(this.get, a => Stream.concat(
                Stream.make(a),
                Stream.map(this.parent.changes, this.getter),
            ))
        )
    }

    modify<C>(f: (a: A) => readonly [C, A]): Effect.Effect<C> {
        return this.modifyEffect(a => Effect.succeed(f(a)))
    }

    modifyEffect<C, E, R>(f: (a: A) => Effect.Effect<readonly [C, A], E, R>): Effect.Effect<C, E, R> {
        return Effect.Do.pipe(
            Effect.bind("b", (): Effect.Effect<Effect.Effect.Success<B>> => this.parent),
            Effect.bind("ca", ({ b }) => f(this.getter(b))),
            Effect.tap(({ b, ca: [, a] }) => SubscriptionRef.set(this.parent, this.setter(b, a))),
            Effect.map(({ ca: [c] }) => c),
        )
    }
}


export const isSubscriptionSubRef = (u: unknown): u is SubscriptionSubRef<unknown, SubscriptionRef.SubscriptionRef<unknown>> => Predicate.hasProperty(u, SubscriptionSubRefTypeId)

export const makeFromGetSet = <A, B extends SubscriptionRef.SubscriptionRef<any>>(
    parent: B,
    options: {
        readonly get: (parentValue: Effect.Effect.Success<B>) => A
        readonly set: (parentValue: Effect.Effect.Success<B>, value: A) => Effect.Effect.Success<B>
    },
): SubscriptionSubRef<A, B> => new SubscriptionSubRefImpl(parent, options.get, options.set)

export const makeFromPath = <
    B extends SubscriptionRef.SubscriptionRef<any>,
    const P extends PropertyPath.Paths<Effect.Effect.Success<B>>,
>(
    parent: B,
    path: P,
): SubscriptionSubRef<PropertyPath.ValueFromPath<Effect.Effect.Success<B>, P>, B> => new SubscriptionSubRefImpl(
    parent,
    parentValue => Option.getOrThrow(PropertyPath.get(parentValue, path)),
    (parentValue, value) => Option.getOrThrow(PropertyPath.immutableSet(parentValue, path, value)),
)

export const makeFromChunkIndex: {
    <B extends SubscriptionRef.SubscriptionRef<Chunk.NonEmptyChunk<any>>>(
        parent: B,
        index: number,
    ): SubscriptionSubRef<
        Effect.Effect.Success<B> extends Chunk.NonEmptyChunk<infer A> ? A : never,
        B
    >
    <B extends SubscriptionRef.SubscriptionRef<Chunk.Chunk<any>>>(
        parent: B,
        index: number,
    ): SubscriptionSubRef<
        Effect.Effect.Success<B> extends Chunk.Chunk<infer A> ? A : never,
        B
    >
} = (
    parent: SubscriptionRef.SubscriptionRef<Chunk.Chunk<any>>,
    index: number,
) => new SubscriptionSubRefImpl(
    parent,
    parentValue => Chunk.unsafeGet(parentValue, index),
    (parentValue, value) => Chunk.replace(parentValue, index, value),
) as any

export const makeFromChunkFindFirst: {
    <B extends SubscriptionRef.SubscriptionRef<Chunk.NonEmptyChunk<any>>>(
        parent: B,
        findFirstPredicate: Predicate.Predicate<Effect.Effect.Success<B> extends Chunk.NonEmptyChunk<infer A> ? A : never>,
    ): SubscriptionSubRef<
        Effect.Effect.Success<B> extends Chunk.NonEmptyChunk<infer A> ? A : never,
        B
    >
    <B extends SubscriptionRef.SubscriptionRef<Chunk.Chunk<any>>>(
        parent: B,
        findFirstPredicate: Predicate.Predicate<Effect.Effect.Success<B> extends Chunk.Chunk<infer A> ? A : never>,
    ): SubscriptionSubRef<
        Effect.Effect.Success<B> extends Chunk.Chunk<infer A> ? A : never,
        B
    >
} = (
    parent: SubscriptionRef.SubscriptionRef<Chunk.Chunk<never>>,
    findFirstPredicate: Predicate.Predicate.Any,
) => new SubscriptionSubRefImpl(
    parent,
    parentValue => Option.getOrThrow(Chunk.findFirst(parentValue, findFirstPredicate)),
    (parentValue, value) => Option.getOrThrow(Option.andThen(
        Chunk.findFirstIndex(parentValue, findFirstPredicate),
        index => Chunk.replace(parentValue, index, value),
    )),
) as any

export const makeFromChunkFindLast: {
    <B extends SubscriptionRef.SubscriptionRef<Chunk.NonEmptyChunk<any>>>(
        parent: B,
        findLastPredicate: Predicate.Predicate<Effect.Effect.Success<B> extends Chunk.NonEmptyChunk<infer A> ? A : never>,
    ): SubscriptionSubRef<
        Effect.Effect.Success<B> extends Chunk.NonEmptyChunk<infer A> ? A : never,
        B
    >
    <B extends SubscriptionRef.SubscriptionRef<Chunk.Chunk<any>>>(
        parent: B,
        findLastPredicate: Predicate.Predicate<Effect.Effect.Success<B> extends Chunk.Chunk<infer A> ? A : never>,
    ): SubscriptionSubRef<
        Effect.Effect.Success<B> extends Chunk.Chunk<infer A> ? A : never,
        B
    >
} = (
    parent: SubscriptionRef.SubscriptionRef<Chunk.Chunk<never>>,
    findLastPredicate: Predicate.Predicate.Any,
) => new SubscriptionSubRefImpl(
    parent,
    parentValue => Option.getOrThrow(Chunk.findLast(parentValue, findLastPredicate)),
    (parentValue, value) => Option.getOrThrow(Option.andThen(
        Chunk.findLastIndex(parentValue, findLastPredicate),
        index => Chunk.replace(parentValue, index, value),
    )),
) as any
