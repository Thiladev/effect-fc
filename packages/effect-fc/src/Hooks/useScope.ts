import { Effect, ExecutionStrategy, Ref, Runtime, Scope } from "effect"
import * as React from "react"
import { closeScope } from "./internal.js"
import type { ScopeOptions } from "./ScopeOptions.js"


export const useScope: {
    (
        deps: React.DependencyList,
        options?: ScopeOptions,
    ): Effect.Effect<Scope.Scope>
} = Effect.fnUntraced(function*(deps, options) {
    const runtime = yield* Effect.runtime()

    // biome-ignore lint/correctness/useExhaustiveDependencies: no reactivity needed
    const [isInitialRun, initialScope] = React.useMemo(() => Runtime.runSync(runtime)(Effect.all([
        Ref.make(true),
        Scope.make(options?.finalizerExecutionStrategy ?? ExecutionStrategy.sequential),
    ])), [])
    const [scope, setScope] = React.useState(initialScope)

    React.useEffect(() => Runtime.runSync(runtime)(
        Effect.if(isInitialRun, {
            onTrue: () => Effect.as(
                Ref.set(isInitialRun, false),
                () => closeScope(scope, runtime, options),
            ),

            onFalse: () => Scope.make(options?.finalizerExecutionStrategy ?? ExecutionStrategy.sequential).pipe(
                Effect.tap(scope => Effect.sync(() => setScope(scope))),
                Effect.map(scope => () => closeScope(scope, runtime, options)),
            ),
        })
    // biome-ignore lint/correctness/useExhaustiveDependencies: use of React.DependencyList
    ), deps)

    return scope
})
