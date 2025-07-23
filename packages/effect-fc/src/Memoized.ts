import { type Equivalence, Function, Predicate } from "effect"
import type * as Component from "./Component.js"


export const TypeId: unique symbol = Symbol.for("effect-fc/Memoized")
export type TypeId = typeof TypeId

export interface Memoized<P> extends Memoized.Options<P> {
    readonly [TypeId]: TypeId
}

export namespace Memoized {
    export interface Options<P> {
        readonly propsAreEqual?: Equivalence.Equivalence<P>
    }
}


const MemoizedProto = Object.freeze({
    [TypeId]: TypeId
} as const)


export const isMemoized = (u: unknown): u is Memoized<unknown> => Predicate.hasProperty(u, TypeId)

export const memo = <T extends Component.Component<any, any, any>>(
    self: T
): T & Memoized<Component.Component.Props<T>> => Object.setPrototypeOf(
    Object.assign(function() {}, self, MemoizedProto),
    Object.getPrototypeOf(self),
)

export const withOptions: {
    <T extends Component.Component<any, any, any> & Memoized<any>>(
        options: Partial<Memoized.Options<Component.Component.Props<T>>>
    ): (self: T) => T
    <T extends Component.Component<any, any, any> & Memoized<any>>(
        self: T,
        options: Partial<Memoized.Options<Component.Component.Props<T>>>,
    ): T
} = Function.dual(2, <T extends Component.Component<any, any, any> & Memoized<any>>(
    self: T,
    options: Partial<Memoized.Options<Component.Component.Props<T>>>,
): T => Object.setPrototypeOf(
    Object.assign(function() {}, self, options),
    Object.getPrototypeOf(self),
))
