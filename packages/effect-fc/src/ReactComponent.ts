import { Context, Effect, Function, Runtime, Scope, Tracer } from "effect"
import type { Mutable } from "effect/Types"
import * as React from "react"
import * as ReactHook from "./ReactHook.js"


export interface ReactComponent<E, R, P> {
    (props: P): Effect.Effect<React.ReactNode, E, R>
    readonly displayName?: string
}

export const nonReactiveTags = [Tracer.ParentSpan] as const

export const withDisplayName: {
    <C extends ReactComponent<any, any, any>>(displayName: string): (self: C) => C
    <C extends ReactComponent<any, any, any>>(self: C, displayName: string): C
} = Function.dual(2, <C extends ReactComponent<any, any, any>>(
    self: C,
    displayName: string,
): C => {
    (self as Mutable<C>).displayName = displayName
    return self
})

export const useFC: {
    <E, R, P extends {} = {}>(
        self: ReactComponent<E, R, P>,
        options?: ReactHook.ScopeOptions,
    ): Effect.Effect<React.FC<P>, never, Exclude<R, Scope.Scope>>
} = Effect.fnUntraced(function* <E, R, P extends {}>(
    self: ReactComponent<E, R, P>,
    options?: ReactHook.ScopeOptions,
) {
    const runtime = yield* Effect.runtime<Exclude<R, Scope.Scope>>()

    return React.useMemo(() => function ScopeProvider(props: P) {
        const scope = Runtime.runSync(runtime)(ReactHook.useScope(options))

        const FC = React.useMemo(() => {
            const f = (props: P) => Runtime.runSync(runtime)(
                Effect.provideService(self(props), Scope.Scope, scope)
            )
            if (self.displayName) f.displayName = self.displayName
            return f
        }, [scope])

        return React.createElement(FC, props)
    }, Array.from(
        Context.omit(...nonReactiveTags)(runtime.context).unsafeMap.values()
    ))
})

export const use: {
    <E, R, P extends {} = {}>(
        self: ReactComponent<E, R, P>,
        fn: (Component: React.FC<P>) => React.ReactNode,
        options?: ReactHook.ScopeOptions,
    ): Effect.Effect<React.ReactNode, never, Exclude<R, Scope.Scope>>
} = Effect.fnUntraced(function*(self, fn, options) {
    return fn(yield* useFC(self, options))
})

export const withRuntime: {
    <E, R, P extends {} = {}>(context: React.Context<Runtime.Runtime<R>>): (self: ReactComponent<E, R, P>) => React.FC<P>
    <E, R, P extends {} = {}>(self: ReactComponent<E, R, P>, context: React.Context<Runtime.Runtime<R>>): React.FC<P>
} = Function.dual(2, <E, R, P extends {}>(
    self: ReactComponent<E, R, P>,
    context: React.Context<Runtime.Runtime<R>>,
): React.FC<P> => function WithRuntime(props) {
    const runtime = React.useContext(context)
    return React.createElement(Runtime.runSync(runtime)(useFC(self)), props)
})
