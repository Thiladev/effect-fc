import { Effect, Function, Predicate, Runtime, Scope } from "effect"
import * as React from "react"
import type * as Component from "./Component.js"


export const TypeId: unique symbol = Symbol.for("effect-fc/Suspense")
export type TypeId = typeof TypeId

export interface Suspense extends Suspense.Options {
    readonly [TypeId]: TypeId
}

export namespace Suspense {
    export interface Options {
        readonly defaultFallback?: React.ReactNode
    }

    export type Props = Omit<React.SuspenseProps, "children">
}


const SuspenseProto = Object.freeze({
    [TypeId]: TypeId,

    makeFunctionComponent<P extends {}, A extends React.ReactNode, E, R>(
        this: Component.Component<P, A, E, R> & Suspense,
        runtimeRef: React.RefObject<Runtime.Runtime<Exclude<R, Scope.Scope>>>,
        scope: Scope.Scope,
    ) {
        const SuspenseInner = (props: { readonly promise: Promise<React.ReactNode> }) => React.use(props.promise)

        return ({ fallback, name, ...props }: Suspense.Props) => {
            const promise = Runtime.runPromise(runtimeRef.current)(
                Effect.provideService(this.body(props as P), Scope.Scope, scope)
            )

            return React.createElement(
                React.Suspense,
                { fallback: fallback ?? this.defaultFallback, name },
                React.createElement(SuspenseInner, { promise }),
            )
        }
    },
} as const)


export const isSuspense = (u: unknown): u is Suspense => Predicate.hasProperty(u, TypeId)

export const suspense = <T extends Component.Component<any, any, any, any>>(
    self: T
): (
    & Omit<T, keyof Component.Component.AsComponent<T>>
    & Component.Component<
        Component.Component.Props<T> & Suspense.Props,
        Component.Component.Success<T>,
        Component.Component.Error<T>,
        Component.Component.Context<T>
    >
    & Suspense
) => Object.setPrototypeOf(
    Object.assign(function() {}, self),
    Object.freeze(Object.setPrototypeOf(
        Object.assign({}, SuspenseProto),
        Object.getPrototypeOf(self),
    )),
)

export const withOptions: {
    <T extends Component.Component<any, any, any, any> & Suspense>(
        options: Partial<Suspense.Options>
    ): (self: T) => T
    <T extends Component.Component<any, any, any, any> & Suspense>(
        self: T,
        options: Partial<Suspense.Options>,
    ): T
} = Function.dual(2, <T extends Component.Component<any, any, any, any> & Suspense>(
    self: T,
    options: Partial<Suspense.Options>,
): T => Object.setPrototypeOf(
    Object.assign(function() {}, self, options),
    Object.getPrototypeOf(self),
))
