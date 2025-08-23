import { Effect, ExecutionStrategy, Runtime, Scope } from "effect"
import * as React from "react"
import { closeScope } from "./internal.js"
import type { ScopeOptions } from "./ScopeOptions.js"


export const useFork: {
    <E, R>(
        effect: () => Effect.Effect<void, E, R>,
        deps?: React.DependencyList,
        options?: Runtime.RunForkOptions & ScopeOptions,
    ): Effect.Effect<void, never, Exclude<R, Scope.Scope>>
} = Effect.fnUntraced(function* <E, R>(
    effect: () => Effect.Effect<void, E, R>,
    deps?: React.DependencyList,
    options?: Runtime.RunForkOptions & ScopeOptions,
) {
    const runtime = yield* Effect.runtime<Exclude<R, Scope.Scope>>()

    React.useEffect(() => {
        const scope = Runtime.runSync(runtime)(options?.scope
            ? Scope.fork(options.scope, options?.finalizerExecutionStrategy ?? ExecutionStrategy.sequential)
            : Scope.make(options?.finalizerExecutionStrategy ?? ExecutionStrategy.sequential)
        )
        Runtime.runFork(runtime)(Effect.provideService(effect(), Scope.Scope, scope), { ...options, scope })
        return () => closeScope(scope, runtime, {
            ...options,
            finalizerExecutionMode: options?.finalizerExecutionMode ?? "fork",
        })
    }, deps)
})
