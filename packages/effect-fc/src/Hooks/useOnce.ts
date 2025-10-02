import { Effect } from "effect"
import { useMemo } from "./useMemo.js"


export const useOnce: {
    <A, E, R>(factory: () => Effect.Effect<A, E, R>): Effect.Effect<A, E, R>
} = Effect.fnUntraced(function* <A, E, R>(
    factory: () => Effect.Effect<A, E, R>
) {
    return yield* useMemo(factory, [])
})
