import { Effect, Equivalence, Ref, type Scope, Stream, SubscriptionRef } from "effect"
import * as React from "react"
import * as Component from "./Component.js"
import * as SetStateAction from "./SetStateAction.js"


export namespace useSubscriptionRefState {
    export interface Options<A> {
        readonly equivalence?: Equivalence.Equivalence<A>
    }
}

export const useSubscriptionRefState: {
    <A>(
        ref: SubscriptionRef.SubscriptionRef<A>,
        options?: useSubscriptionRefState.Options<NoInfer<A>>,
    ): Effect.Effect<readonly [A, React.Dispatch<React.SetStateAction<A>>], never, Scope.Scope>
} = Effect.fnUntraced(function* <A>(
    ref: SubscriptionRef.SubscriptionRef<A>,
    options?: useSubscriptionRefState.Options<NoInfer<A>>,
) {
    const [reactStateValue, setReactStateValue] = React.useState(yield* Component.useOnMount(() => ref))

    yield* Component.useReactEffect(() => Effect.forkScoped(
        Stream.runForEach(
            Stream.changesWith(ref.changes, options?.equivalence ?? Equivalence.strict()),
            v => Effect.sync(() => setReactStateValue(v)),
        )
    ), [ref])

    const setValue = yield* Component.useCallbackSync((setStateAction: React.SetStateAction<A>) =>
        Effect.andThen(
            Ref.updateAndGet(ref, prevState => SetStateAction.value(setStateAction, prevState)),
            v => setReactStateValue(v),
        ),
    [ref])

    return [reactStateValue, setValue]
})

export namespace useSubscriptionRefFromState {
    export interface Options<A> {
        readonly equivalence?: Equivalence.Equivalence<A>
    }
}

export const useSubscriptionRefFromState: {
    <A>(
        state: readonly [A, React.Dispatch<React.SetStateAction<A>>],
        options?: useSubscriptionRefFromState.Options<NoInfer<A>>,
    ): Effect.Effect<SubscriptionRef.SubscriptionRef<A>, never, Scope.Scope>
} = Effect.fnUntraced(function*([value, setValue], options) {
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
