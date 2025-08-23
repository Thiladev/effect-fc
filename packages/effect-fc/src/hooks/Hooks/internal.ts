import { Exit, Runtime, Scope } from "effect"
import type { ScopeOptions } from "./ScopeOptions.js"


export const closeScope = (
    scope: Scope.CloseableScope,
    runtime: Runtime.Runtime<never>,
    options?: ScopeOptions,
) => {
    switch (options?.finalizerExecutionMode ?? "sync") {
        case "sync":
            Runtime.runSync(runtime)(Scope.close(scope, Exit.void))
            break
        case "fork":
            Runtime.runFork(runtime)(Scope.close(scope, Exit.void))
            break
    }
}
