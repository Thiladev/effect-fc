import { Effect, type Layer, ManagedRuntime, type Runtime } from "effect"
import * as React from "react"


export interface ReactManagedRuntime<R, ER> {
    readonly runtime: ManagedRuntime.ManagedRuntime<R, ER>
    readonly context: React.Context<Runtime.Runtime<R>>
}

export const make = <R, ER>(
    layer: Layer.Layer<R, ER>,
    memoMap?: Layer.MemoMap,
): ReactManagedRuntime<R, ER> => ({
    runtime: ManagedRuntime.make(layer, memoMap),
    context: React.createContext<Runtime.Runtime<R>>(null!),
})


export interface ProviderProps<R, ER> extends React.SuspenseProps {
    readonly runtime: ReactManagedRuntime<R, ER>
    readonly children?: React.ReactNode
}

export function Provider<R, ER>(
    { runtime, children, ...suspenseProps }: ProviderProps<R, ER>
): React.ReactNode {
    const promise = React.useMemo(() => Effect.runPromise(runtime.runtime.runtimeEffect), [runtime])

    return React.createElement(
        React.Suspense,
        suspenseProps,
        React.createElement(ProviderInner<R, ER>, { runtime, promise, children }),
    )
}

interface ProviderInnerProps<R, ER> {
    readonly runtime: ReactManagedRuntime<R, ER>
    readonly promise: Promise<Runtime.Runtime<R>>
    readonly children?: React.ReactNode
}

function ProviderInner<R, ER>(
    { runtime, promise, children }: ProviderInnerProps<R, ER>
): React.ReactNode {
    const value = React.use(promise)
    return React.createElement(runtime.context, { value }, children)
}
