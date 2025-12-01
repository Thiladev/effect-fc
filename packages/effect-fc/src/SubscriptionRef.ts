import { Effect, Equivalence, Ref, Stream, SubscriptionRef } from "effect"
import * as React from "react"
import * as Component from "./Component.js"
import * as SetStateAction from "./SetStateAction.js"


export declare namespace useSubscriptionRefState {
    export interface Options<A> {
        readonly equivalence?: Equivalence.Equivalence<A>
    }
}

export const useSubscriptionRefState = Effect.fnUntraced(function* <A>(
    ref: SubscriptionRef.SubscriptionRef<A>,
    options?: useSubscriptionRefState.Options<NoInfer<A>>,
): Effect.fn.Return<readonly [A, React.Dispatch<React.SetStateAction<A>>]> {
    const [reactStateValue, setReactStateValue] = React.useState(yield* Component.useOnMount(() => ref))

    yield* Component.useReactEffect(() => Effect.forkScoped(
        Stream.runForEach(
            Stream.changesWith(ref.changes, options?.equivalence ?? Equivalence.strict()),
            v => Effect.sync(() => setReactStateValue(v)),
        )
    ), [ref])

    const setValue = yield* Component.useCallbackSync(
        (setStateAction: React.SetStateAction<A>) => Effect.andThen(
            Ref.updateAndGet(ref, prevState => SetStateAction.value(setStateAction, prevState)),
            v => setReactStateValue(v),
        ),
        [ref],
    )

    return [reactStateValue, setValue]
})

export declare namespace useSubscriptionRefFromState {
    export interface Options<A> {
        readonly equivalence?: Equivalence.Equivalence<A>
    }
}

export const useSubscriptionRefFromState = Effect.fnUntraced(function* <A>(
    [value, setValue]: readonly [A, React.Dispatch<React.SetStateAction<A>>],
    options?: useSubscriptionRefFromState.Options<NoInfer<A>>,
): Effect.fn.Return<SubscriptionRef.SubscriptionRef<A>> {
    const ref = yield* Component.useOnChange(() => Effect.tap(
        SubscriptionRef.make(value),
        ref => Effect.forkScoped(
            Stream.runForEach(
                Stream.changesWith(ref.changes, options?.equivalence ?? Equivalence.strict()),
                v => Effect.sync(() => setValue(v)),
            )
        ),
    ), [setValue])

    yield* Component.useReactEffect(() => Ref.set(ref, value), [value])
    return ref
})

export * from "effect/SubscriptionRef"
