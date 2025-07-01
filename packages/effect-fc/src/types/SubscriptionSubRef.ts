import { Effect, Effectable, Option, Readable, Ref, Stream, Subscribable, SubscriptionRef, SynchronizedRef, type Types, type Unify } from "effect"
import * as PropertyPath from "./PropertyPath.js"


export const SubscriptionSubRefTypeId: unique symbol = Symbol.for("reffuse/types/SubscriptionSubRef")
export type SubscriptionSubRefTypeId = typeof SubscriptionSubRefTypeId

export interface SubscriptionSubRef<in out A, in out B> extends SubscriptionSubRef.Variance<A, B>, SubscriptionRef.SubscriptionRef<A> {
    readonly parent: SubscriptionRef.SubscriptionRef<B>

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

class SubscriptionSubRefImpl<in out A, in out B> extends Effectable.Class<A> implements SubscriptionSubRef<A, B> {
    readonly [Readable.TypeId]: Readable.TypeId = Readable.TypeId
    readonly [Subscribable.TypeId]: Subscribable.TypeId = Subscribable.TypeId
    readonly [Ref.RefTypeId] = refVariance
    readonly [SynchronizedRef.SynchronizedRefTypeId] = synchronizedRefVariance
    readonly [SubscriptionRef.SubscriptionRefTypeId] = subscriptionRefVariance
    readonly [SubscriptionSubRefTypeId] = subscriptionSubRefVariance

    readonly get: Effect.Effect<A>

    constructor(
        readonly parent: SubscriptionRef.SubscriptionRef<B>,
        readonly getter: (parentValue: B) => A,
        readonly setter: (parentValue: B, value: A) => B,
    ) {
        super()
        this.get = Effect.map(Ref.get(this.parent), this.getter)
    }

    commit() {
        return this.get
    }

    get changes(): Stream.Stream<A> {
        return this.get.pipe(
            Effect.map(a => this.parent.changes.pipe(
                Stream.map(this.getter),
                s => Stream.concat(Stream.make(a), s),
            )),
            Stream.unwrap,
        )
    }

    modify<C>(f: (a: A) => readonly [C, A]): Effect.Effect<C> {
        return this.modifyEffect(a => Effect.succeed(f(a)))
    }

    modifyEffect<C, E, R>(f: (a: A) => Effect.Effect<readonly [C, A], E, R>): Effect.Effect<C, E, R> {
        return Effect.Do.pipe(
            Effect.bind("b", () => Ref.get(this.parent)),
            Effect.bind("ca", ({ b }) => f(this.getter(b))),
            Effect.tap(({ b, ca: [, a] }) => Ref.set(this.parent, this.setter(b, a))),
            Effect.map(({ ca: [c] }) => c),
        )
    }
}


export const makeFromGetSet = <A, B>(
    parent: SubscriptionRef.SubscriptionRef<B>,
    getter: (parentValue: B) => A,
    setter: (parentValue: B, value: A) => B,
): SubscriptionSubRef<A, B> => new SubscriptionSubRefImpl(parent, getter, setter)

export const makeFromPath = <B, const P extends PropertyPath.Paths<B>>(
    parent: SubscriptionRef.SubscriptionRef<B>,
    path: P,
): SubscriptionSubRef<PropertyPath.ValueFromPath<B, P>, B> => new SubscriptionSubRefImpl(
    parent,
    parentValue => Option.getOrThrow(PropertyPath.get(parentValue, path)),
    (parentValue, value) => Option.getOrThrow(PropertyPath.immutableSet(parentValue, path, value)),
)
