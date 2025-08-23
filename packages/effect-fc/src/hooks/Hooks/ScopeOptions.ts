import type { ExecutionStrategy } from "effect"


export interface ScopeOptions {
    readonly finalizerExecutionMode?: "sync" | "fork"
    readonly finalizerExecutionStrategy?: ExecutionStrategy.ExecutionStrategy
}
