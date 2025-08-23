import { Effect, ExecutionStrategy, Runtime, Scope } from "effect"
import * as React from "react"
import type { ScopeOptions } from "./ScopeOptions.js"
import { closeScope } from "./internal.js"


export const useEffect: {
    <E, R>(
        effect: () => Effect.Effect<void, E, R>,
        deps?: React.DependencyList,
        options?: ScopeOptions,
    ): Effect.Effect<void, never, Exclude<R, Scope.Scope>>
} = Effect.fnUntraced(function* <E, R>(
    effect: () => Effect.Effect<void, E, R>,
    deps?: React.DependencyList,
    options?: ScopeOptions,
) {
    const runtime = yield* Effect.runtime<Exclude<R, Scope.Scope>>()

    React.useEffect(() => Effect.Do.pipe(
        Effect.bind("scope", () => Scope.make(options?.finalizerExecutionStrategy ?? ExecutionStrategy.sequential)),
        Effect.bind("exit", ({ scope }) => Effect.exit(Effect.provideService(effect(), Scope.Scope, scope))),
        Effect.map(({ scope }) =>
            () => closeScope(scope, runtime, options)
        ),
        Runtime.runSync(runtime),
    ), deps)
})
