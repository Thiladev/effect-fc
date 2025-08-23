import { type Equivalence, Function, Predicate } from "effect"
import type * as Component from "./Component.js"


export const TypeId: unique symbol = Symbol.for("effect-fc/Memo")
export type TypeId = typeof TypeId

export interface Memo<P> extends Memo.Options<P> {
    readonly [TypeId]: TypeId
}

export namespace Memo {
    export interface Options<P> {
        readonly propsAreEqual?: Equivalence.Equivalence<P>
    }
}


const MemoProto = Object.freeze({
    [TypeId]: TypeId
} as const)


export const isMemo = (u: unknown): u is Memo<unknown> => Predicate.hasProperty(u, TypeId)

export const memo = <T extends Component.Component<any, any, any, any>>(
    self: T
): T & Memo<Component.Component.Props<T>> => Object.setPrototypeOf(
    Object.assign(function() {}, self),
    Object.freeze(Object.setPrototypeOf(
        Object.assign({}, MemoProto),
        Object.getPrototypeOf(self),
    )),
)

export const withOptions: {
    <T extends Component.Component<any, any, any, any> & Memo<any>>(
        options: Partial<Memo.Options<Component.Component.Props<T>>>
    ): (self: T) => T
    <T extends Component.Component<any, any, any, any> & Memo<any>>(
        self: T,
        options: Partial<Memo.Options<Component.Component.Props<T>>>,
    ): T
} = Function.dual(2, <T extends Component.Component<any, any, any, any> & Memo<any>>(
    self: T,
    options: Partial<Memo.Options<Component.Component.Props<T>>>,
): T => Object.setPrototypeOf(
    Object.assign(function() {}, self, options),
    Object.getPrototypeOf(self),
))
