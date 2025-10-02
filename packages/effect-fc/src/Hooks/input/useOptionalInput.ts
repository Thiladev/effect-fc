import { type Duration, Effect, Equal, Equivalence, flow, identity, Option, type ParseResult, Ref, Schema, Stream, SubscriptionRef } from "effect"
import * as React from "react"
import * as SetStateAction from "../../SetStateAction.js"
import { useCallbackSync } from "../useCallbackSync.js"
import { useFork } from "../useFork.js"
import { useOnce } from "../useOnce.js"
import { useRefState } from "../useRefState.js"
import { useSubscribables } from "../useSubscribables.js"


export namespace useOptionalInput {
    export interface Options<A, R> {
        readonly schema: Schema.Schema<A, string, R>
        readonly defaultValue?: A
        readonly equivalence?: Equivalence.Equivalence<A>
        readonly ref: SubscriptionRef.SubscriptionRef<Option.Option<A>>
        readonly debounce?: Duration.DurationInput
    }

    export interface Result {
        readonly value: string
        readonly setValue: React.Dispatch<React.SetStateAction<string>>
        readonly enabled: boolean
        readonly setEnabled: React.Dispatch<React.SetStateAction<boolean>>
        readonly error: Option.Option<ParseResult.ParseError>
    }
}

export const useOptionalInput: {
    <A, R>(options: useOptionalInput.Options<A, R>): Effect.Effect<useOptionalInput.Result, ParseResult.ParseError, R>
} = Effect.fnUntraced(function* <A, R>(options: useOptionalInput.Options<A, R>) {
    const [internalRef, enabledRef] = yield* useOnce(() => Effect.andThen(options.ref, upstreamValue =>
        Effect.all([
            Effect.andThen(
                Option.match(upstreamValue, {
                    onSome: Schema.encode(options.schema),
                    onNone: () => options.defaultValue
                        ? Schema.encode(options.schema)(options.defaultValue)
                        : Effect.succeed(""),
                }),
                SubscriptionRef.make,
            ),

            SubscriptionRef.make(Option.isSome(upstreamValue)),
        ])
    ))

    const [error, setError] = React.useState(Option.none<ParseResult.ParseError>())

    yield* useFork(() => Effect.all([
        // Sync the upstream state with the internal state
        // Only mutate the internal state if the upstream value is actually different. This avoids infinite re-render loops.
        Stream.runForEach(Stream.changesWith(options.ref.changes, Equivalence.strict()), Option.match({
            onSome: upstreamValue => Effect.andThen(
                Ref.set(enabledRef, true),

                Effect.whenEffect(
                    Effect.andThen(
                        Schema.encode(options.schema)(upstreamValue),
                        encodedUpstreamValue => Ref.set(internalRef, encodedUpstreamValue),
                    ),
                    internalRef.pipe(
                        Effect.andThen(Schema.decode(options.schema)),
                        Effect.andThen(decodedInternalValue => !(options.equivalence ?? Equal.equals)(upstreamValue, decodedInternalValue)),
                        Effect.catchTag("ParseError", () => Effect.succeed(false)),
                    ),
                ),
            ),

            onNone: () => Ref.set(enabledRef, false),
        })),

        // Sync all changes to the internal state with upstream
        Stream.runForEach(
            internalRef.changes.pipe(
                Stream.changesWith(Equivalence.strict()),
                options.debounce ? Stream.debounce(options.debounce) : identity,
                Stream.drop(1),
            ),
            flow(
                Schema.decode(options.schema),
                Effect.andThen(v => Ref.set(options.ref, Option.some(v))),
                Effect.andThen(() => setError(Option.none())),
                Effect.catchTag("ParseError", e => Effect.sync(() => setError(Option.some(e)))),
            ),
        ),
    ], { concurrency: "unbounded" }), [options.schema, options.equivalence, options.ref, options.debounce, internalRef])

    const setEnabled = yield* useCallbackSync(
        (setStateAction: React.SetStateAction<boolean>) => Effect.andThen(
            Ref.updateAndGet(enabledRef, prevState => SetStateAction.value(setStateAction, prevState)),
            enabled => enabled
                ? internalRef.pipe(
                    Effect.andThen(Schema.decode(options.schema)),
                    Effect.andThen(v => Ref.set(options.ref, Option.some(v))),
                    Effect.andThen(() => setError(Option.none())),
                    Effect.catchTag("ParseError", e => Effect.sync(() => setError(Option.some(e)))),
                )
                : Ref.set(options.ref, Option.none()),
        ),
        [options.schema, options.ref, internalRef, enabledRef],
    )

    const [enabled] = yield* useSubscribables(enabledRef)
    const [value, setValue] = yield* useRefState(internalRef)
    return { value, setValue, enabled, setEnabled, error }
})
