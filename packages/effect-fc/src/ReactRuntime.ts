import { Effect, type Layer, ManagedRuntime, Predicate, type Runtime } from "effect"
import * as React from "react"


export const TypeId: unique symbol = Symbol.for("effect-fc/ReactRuntime")
export type TypeId = typeof TypeId

export interface ReactRuntime<R, ER> {
    new(_: never): {}
    readonly [TypeId]: TypeId
    readonly runtime: ManagedRuntime.ManagedRuntime<R, ER>
    readonly context: React.Context<Runtime.Runtime<R>>
}

const ReactRuntimeProto = Object.freeze({ [TypeId]: TypeId } as const)


export const isReactRuntime = (u: unknown): u is ReactRuntime<unknown, unknown> => Predicate.hasProperty(u, TypeId)

export const make = <R, ER>(
    layer: Layer.Layer<R, ER>,
    memoMap?: Layer.MemoMap,
): ReactRuntime<R, ER> => Object.setPrototypeOf(
    Object.assign(function() {}, {
        runtime: ManagedRuntime.make(layer, memoMap),
        context: React.createContext<Runtime.Runtime<R>>(null!),
    }),
    ReactRuntimeProto,
)


export namespace Provider {
    export interface Props<R, ER> extends React.SuspenseProps {
        readonly runtime: ReactRuntime<R, ER>
        readonly children?: React.ReactNode
    }
}

export const Provider = <R, ER>(
    { runtime, children, ...suspenseProps }: Provider.Props<R, ER>
): React.ReactNode => {
    const promise = React.useMemo(() => Effect.runPromise(runtime.runtime.runtimeEffect), [runtime])

    return React.createElement(
        React.Suspense,
        suspenseProps,
        React.createElement(ProviderInner<R, ER>, { runtime, promise, children }),
    )
}

namespace ProviderInner {
    export interface Props<R, ER> {
        readonly runtime: ReactRuntime<R, ER>
        readonly promise: Promise<Runtime.Runtime<R>>
        readonly children?: React.ReactNode
    }
}

const ProviderInner = <R, ER>(
    { runtime, promise, children }: ProviderInner.Props<R, ER>
): React.ReactNode => React.createElement(
    runtime.context,
    { value: React.use(promise) },
    children,
)
