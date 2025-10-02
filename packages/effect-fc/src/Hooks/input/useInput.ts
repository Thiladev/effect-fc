import { type Duration, Effect, Equal, Equivalence, flow, identity, Option, type ParseResult, Ref, Schema, Stream, SubscriptionRef } from "effect"
import * as React from "react"
import { useFork } from "../useFork.js"
import { useOnce } from "../useOnce.js"
import { useRefState } from "../useRefState.js"


export namespace useInput {
    export interface Options<A, R> {
        readonly schema: Schema.Schema<A, string, R>
        readonly equivalence?: Equivalence.Equivalence<A>
        readonly ref: SubscriptionRef.SubscriptionRef<A>
        readonly debounce?: Duration.DurationInput
    }

    export interface Result {
        readonly value: string
        readonly setValue: React.Dispatch<React.SetStateAction<string>>
        readonly error: Option.Option<ParseResult.ParseError>
    }
}

export const useInput: {
    <A, R>(options: useInput.Options<A, R>): Effect.Effect<useInput.Result, ParseResult.ParseError, R>
} = Effect.fnUntraced(function* <A, R>(options: useInput.Options<A, R>) {
    const internalRef = yield* useOnce(() => options.ref.pipe(
        Effect.andThen(Schema.encode(options.schema)),
        Effect.andThen(SubscriptionRef.make),
    ))
    const [error, setError] = React.useState(Option.none<ParseResult.ParseError>())

    yield* useFork(() => Effect.all([
        // Sync the upstream state with the internal state
        // Only mutate the internal state if the upstream value is actually different. This avoids infinite re-render loops.
        Stream.runForEach(Stream.changesWith(options.ref.changes, Equivalence.strict()), upstreamValue =>
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
            )
        ),

        // Sync all changes to the internal state with upstream
        Stream.runForEach(
            internalRef.changes.pipe(
                Stream.changesWith(Equivalence.strict()),
                options.debounce ? Stream.debounce(options.debounce) : identity,
                Stream.drop(1),
            ),
            flow(
                Schema.decode(options.schema),
                Effect.andThen(v => Ref.set(options.ref, v)),
                Effect.andThen(() => setError(Option.none())),
                Effect.catchTag("ParseError", e => Effect.sync(() => setError(Option.some(e)))),
            ),
        ),
    ], { concurrency: "unbounded" }), [options.schema, options.equivalence, options.ref, options.debounce, internalRef])

    const [value, setValue] = yield* useRefState(internalRef)
    return { value, setValue, error }
})
