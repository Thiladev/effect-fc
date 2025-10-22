import { Effect, Equivalence, Ref, type Scope, Stream, SubscriptionRef } from "effect"
import * as React from "react"
import * as Component from "./Component.js"
import * as SetStateAction from "./SetStateAction.js"


export const useSubscriptionRefState: {
    <A>(
        ref: SubscriptionRef.SubscriptionRef<A>
    ): Effect.Effect<readonly [A, React.Dispatch<React.SetStateAction<A>>], never, Scope.Scope>
} = Effect.fnUntraced(function* <A>(ref: SubscriptionRef.SubscriptionRef<A>) {
    const [reactStateValue, setReactStateValue] = React.useState(yield* Component.useOnMount(() => ref))

    yield* Component.useOnChange(() => Effect.forkScoped(Stream.runForEach(
        Stream.changesWith(ref.changes, Equivalence.strict()),
        v => Effect.sync(() => setReactStateValue(v)),
    )), [ref])

    const setValue = yield* Component.useCallbackSync((setStateAction: React.SetStateAction<A>) =>
        Effect.andThen(
            Ref.updateAndGet(ref, prevState => SetStateAction.value(setStateAction, prevState)),
            v => setReactStateValue(v),
        ),
    [ref])

    return [reactStateValue, setValue]
})

export const useSubscriptionRefFromState: {
    <A>(state: readonly [A, React.Dispatch<React.SetStateAction<A>>]): Effect.Effect<SubscriptionRef.SubscriptionRef<A>, never, Scope.Scope>
} = Effect.fnUntraced(function*([value, setValue]) {
    const ref = yield* Component.useOnMount(() => SubscriptionRef.make(value))

    yield* Component.useOnChange(() => Effect.forkScoped(Stream.runForEach(
        Stream.changesWith(ref.changes, Equivalence.strict()),
        v => Effect.sync(() => setValue(v)),
    )), [setValue])
    yield* Component.useReactEffect(() => Ref.set(ref, value), [value])

    return ref
})

export * from "effect/SubscriptionRef"
