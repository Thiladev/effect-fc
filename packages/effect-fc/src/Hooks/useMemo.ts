import { Effect, Runtime } from "effect"
import * as React from "react"


export const useMemo: {
    <A, E, R>(
        factory: () => Effect.Effect<A, E, R>,
        deps: React.DependencyList,
    ): Effect.Effect<A, E, R>
} = Effect.fnUntraced(function* <A, E, R>(
    factory: () => Effect.Effect<A, E, R>,
    deps: React.DependencyList,
) {
    const runtime = yield* Effect.runtime()
    // biome-ignore lint/correctness/useExhaustiveDependencies: use of React.DependencyList
    return yield* React.useMemo(() => Runtime.runSync(runtime)(Effect.cached(factory())), deps)
})
