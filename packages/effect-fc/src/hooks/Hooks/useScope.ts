import { Effect, ExecutionStrategy, Ref, Runtime, Scope } from "effect"
import * as React from "react"
import type { ScopeOptions } from "./ScopeOptions.js"
import { closeScope } from "./internal.js"


export const useScope: {
    (
        deps: React.DependencyList,
        options?: ScopeOptions,
    ): Effect.Effect<Scope.Scope>
} = Effect.fnUntraced(function*(deps, options) {
    const runtime = yield* Effect.runtime()

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
    ), deps)

    return scope
})
