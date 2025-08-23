import { Effect, Runtime } from "effect"
import * as React from "react"


export const useCallbackSync: {
    <Args extends unknown[], A, E, R>(
        callback: (...args: Args) => Effect.Effect<A, E, R>,
        deps: React.DependencyList,
    ): Effect.Effect<(...args: Args) => A, never, R>
} = Effect.fnUntraced(function* <Args extends unknown[], A, E, R>(
    callback: (...args: Args) => Effect.Effect<A, E, R>,
    deps: React.DependencyList,
) {
    const runtimeRef = React.useRef<Runtime.Runtime<R>>(null!)
    runtimeRef.current = yield* Effect.runtime<R>()

    return React.useCallback((...args: Args) => Runtime.runSync(runtimeRef.current)(callback(...args)), deps)
})
