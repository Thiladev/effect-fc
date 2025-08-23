import { Effect, Equivalence, Ref, Stream, SubscriptionRef } from "effect"
import type * as React from "react"
import { useEffect } from "./useEffect.js"
import { useFork } from "./useFork.js"
import { useOnce } from "./useOnce.js"


export const useRefFromState: {
    <A>(state: readonly [A, React.Dispatch<React.SetStateAction<A>>]): Effect.Effect<SubscriptionRef.SubscriptionRef<A>>
} = Effect.fnUntraced(function*([value, setValue]) {
    const ref = yield* useOnce(() => SubscriptionRef.make(value))

    yield* useEffect(() => Ref.set(ref, value), [value])
    yield* useFork(() => Stream.runForEach(
        Stream.changesWith(ref.changes, Equivalence.strict()),
        v => Effect.sync(() => setValue(v)),
    ), [setValue])

    return ref
})
