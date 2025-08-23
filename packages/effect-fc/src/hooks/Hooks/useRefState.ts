import { Effect, Equivalence, Ref, Stream, SubscriptionRef } from "effect"
import * as React from "react"
import { SetStateAction } from "../../types/index.js"
import { useCallbackSync } from "./useCallbackSync.js"
import { useFork } from "./useFork.js"
import { useOnce } from "./useOnce.js"


export const useRefState: {
    <A>(
        ref: SubscriptionRef.SubscriptionRef<A>
    ): Effect.Effect<readonly [A, React.Dispatch<React.SetStateAction<A>>]>
} = Effect.fnUntraced(function* <A>(ref: SubscriptionRef.SubscriptionRef<A>) {
    const [reactStateValue, setReactStateValue] = React.useState(yield* useOnce(() => ref))

    yield* useFork(() => Stream.runForEach(
        Stream.changesWith(ref.changes, Equivalence.strict()),
        v => Effect.sync(() => setReactStateValue(v)),
    ), [ref])

    const setValue = yield* useCallbackSync((setStateAction: React.SetStateAction<A>) =>
        Effect.andThen(
            Ref.updateAndGet(ref, prevState => SetStateAction.value(setStateAction, prevState)),
            v => setReactStateValue(v),
        ),
    [ref])

    return [reactStateValue, setValue]
})
