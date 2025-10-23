import * as AsyncData from "@typed/async-data"
import { Array, Cause, Chunk, type Duration, Effect, Equal, Exit, Fiber, flow, identity, Option, ParseResult, Pipeable, Predicate, Ref, Schema, type Scope, Stream } from "effect"
import type { NoSuchElementException } from "effect/Cause"
import * as React from "react"
import * as Component from "./Component.js"
import * as PropertyPath from "./PropertyPath.js"
import * as Subscribable from "./Subscribable.js"
import * as SubscriptionRef from "./SubscriptionRef.js"
import * as SubscriptionSubRef from "./SubscriptionSubRef.js"


export const FormTypeId: unique symbol = Symbol.for("@effect-fc/Form/Form")
export type FormTypeId = typeof FormTypeId

export interface Form<in out A, in out I = A, out R = never, in out SA = void, in out SE = A, out SR = never>
extends Pipeable.Pipeable {
    readonly [FormTypeId]: FormTypeId

    readonly schema: Schema.Schema<A, I, R>
    readonly onSubmit: (value: NoInfer<A>) => Effect.Effect<SA, SE, SR>
    readonly autosubmit: boolean
    readonly debounce: Option.Option<Duration.DurationInput>

    readonly valueRef: SubscriptionRef.SubscriptionRef<Option.Option<A>>
    readonly encodedValueRef: SubscriptionRef.SubscriptionRef<I>
    readonly errorRef: SubscriptionRef.SubscriptionRef<Option.Option<ParseResult.ParseError>>
    readonly validationFiberRef: SubscriptionRef.SubscriptionRef<Option.Option<Fiber.Fiber<void, never>>>
    readonly submitStateRef: SubscriptionRef.SubscriptionRef<AsyncData.AsyncData<SA, SE>>

    readonly canSubmitSubscribable: Subscribable.Subscribable<boolean>
}

class FormImpl<in out A, in out I = A, out R = never, in out SA = void, in out SE = A, out SR = never>
extends Pipeable.Class() implements Form<A, I, R, SA, SE, SR> {
    readonly [FormTypeId]: FormTypeId = FormTypeId

    constructor(
        readonly schema: Schema.Schema<A, I, R>,
        readonly onSubmit: (value: NoInfer<A>) => Effect.Effect<SA, SE, SR>,
        readonly autosubmit: boolean,
        readonly debounce: Option.Option<Duration.DurationInput>,

        readonly valueRef: SubscriptionRef.SubscriptionRef<Option.Option<A>>,
        readonly encodedValueRef: SubscriptionRef.SubscriptionRef<I>,
        readonly errorRef: SubscriptionRef.SubscriptionRef<Option.Option<ParseResult.ParseError>>,
        readonly validationFiberRef: SubscriptionRef.SubscriptionRef<Option.Option<Fiber.Fiber<void, never>>>,
        readonly submitStateRef: SubscriptionRef.SubscriptionRef<AsyncData.AsyncData<SA, SE>>,

        readonly canSubmitSubscribable: Subscribable.Subscribable<boolean>,
    ) {
        super()
    }
}

export const isForm = (u: unknown): u is Form<unknown, unknown, unknown, unknown, unknown, unknown> => Predicate.hasProperty(u, FormTypeId)

export namespace make {
    export interface Options<in out A, in out I, in out R, in out SA = void, in out SE = A, out SR = never> {
        readonly schema: Schema.Schema<A, I, R>
        readonly initialEncodedValue: NoInfer<I>
        readonly onSubmit: (
            this: Form<NoInfer<A>, NoInfer<I>, NoInfer<R>, unknown, unknown, unknown>,
            value: NoInfer<A>,
        ) => Effect.Effect<SA, SE, SR>
        readonly autosubmit?: boolean
        readonly debounce?: Duration.DurationInput
    }
}

export const make: {
    <A, I = A, R = never, SA = void, SE = A, SR = never>(
        options: make.Options<A, I, R, SA, SE, SR>
    ): Effect.Effect<Form<A, I, R, SA, SE, SR>>
} = Effect.fnUntraced(function* <A, I = A, R = never, SA = void, SE = A, SR = never>(
    options: make.Options<A, I, R, SA, SE, SR>
) {
    const valueRef = yield* SubscriptionRef.make(Option.none<A>())
    const errorRef = yield* SubscriptionRef.make(Option.none<ParseResult.ParseError>())
    const validationFiberRef = yield* SubscriptionRef.make(Option.none<Fiber.Fiber<void, never>>())
    const submitStateRef = yield* SubscriptionRef.make(AsyncData.noData<SA, SE>())

    return new FormImpl(
        options.schema,
        options.onSubmit,
        options.autosubmit ?? false,
        Option.fromNullable(options.debounce),

        valueRef,
        yield* SubscriptionRef.make(options.initialEncodedValue),
        errorRef,
        validationFiberRef,
        submitStateRef,

        Subscribable.map(
            Subscribable.zipLatestAll(valueRef, errorRef, validationFiberRef, submitStateRef),
            ([value, error, validationFiber, submitState]) => (
                Option.isSome(value) &&
                Option.isNone(error) &&
                Option.isNone(validationFiber) &&
                !AsyncData.isLoading(submitState)
            ),
        ),
    )
})

export const run = <A, I, R, SA, SE, SR>(
    self: Form<A, I, R, SA, SE, SR>
): Effect.Effect<void, never, Scope.Scope | R | SR> => Stream.runForEach(
    self.encodedValueRef.changes.pipe(
        Option.isSome(self.debounce) ? Stream.debounce(self.debounce.value) : identity
    ),

    encodedValue => self.validationFiberRef.pipe(
        Effect.andThen(Option.match({
            onSome: Fiber.interrupt,
            onNone: () => Effect.void,
        })),
        Effect.andThen(
            Effect.addFinalizer(() => Ref.set(self.validationFiberRef, Option.none())).pipe(
                Effect.andThen(Schema.decode(self.schema, { errors: "all" })(encodedValue)),
                Effect.exit,
                Effect.andThen(flow(
                    Exit.matchEffect({
                        onSuccess: v => Ref.set(self.valueRef, Option.some(v)).pipe(
                            Effect.andThen(Ref.set(self.errorRef, Option.none())),
                            Effect.as(Option.some(v)),
                        ),
                        onFailure: c => Chunk.findFirst(Cause.failures(c), e => e._tag === "ParseError").pipe(
                            Option.match({
                                onSome: e => Ref.set(self.errorRef, Option.some(e)),
                                onNone: () => Effect.void,
                            }),
                            Effect.as(Option.none<A>()),
                        ),
                    }),
                    Effect.uninterruptible,
                )),
                Effect.scoped,

                Effect.andThen(value => Option.isSome(value) && self.autosubmit
                    ? Effect.asVoid(Effect.forkScoped(submit(self)))
                    : Effect.void
                ),
                Effect.forkScoped,
            )
        ),
        Effect.andThen(fiber => Ref.set(self.validationFiberRef, Option.some(fiber)))
    ),
)

export const submit = <A, I, R, SA, SE, SR>(
    self: Form<A, I, R, SA, SE, SR>
): Effect.Effect<Option.Option<AsyncData.AsyncData<SA, SE>>, NoSuchElementException, SR> => Effect.whenEffect(
    self.valueRef.pipe(
        Effect.andThen(identity),
        Effect.tap(Ref.set(self.submitStateRef, AsyncData.loading())),
        Effect.andThen(flow(
            self.onSubmit as (value: NoInfer<A>) => Effect.Effect<SA, SE | ParseResult.ParseError, SR>,
            Effect.tapErrorTag("ParseError", e => Ref.set(self.errorRef, Option.some(e as ParseResult.ParseError))),
            Effect.exit,
            Effect.map(Exit.match({
                onSuccess: a => AsyncData.success(a),
                onFailure: e => AsyncData.failure(e as Cause.Cause<SE>),
            })),
            Effect.tap(v => Ref.set(self.submitStateRef, v)),
        )),
    ),

    self.canSubmitSubscribable.get,
)

export namespace service {
    export interface Options<in out A, in out I, in out R, in out SA = void, in out SE = A, out SR = never>
    extends make.Options<A, I, R, SA, SE, SR> {}
}

export const service = <A, I = A, R = never, SA = void, SE = A, SR = never>(
    options: service.Options<A, I, R, SA, SE, SR>
): Effect.Effect<Form<A, I, R, SA, SE, SR>, never, Scope.Scope | R | SR> => Effect.tap(
    make(options),
    form => Effect.forkScoped(run(form)),
)

export const field = <A, I, R, SA, SE, SR, const P extends PropertyPath.Paths<NoInfer<I>>>(
    self: Form<A, I, R, SA, SE, SR>,
    path: P,
): FormField<PropertyPath.ValueFromPath<A, P>, PropertyPath.ValueFromPath<I, P>> => new FormFieldImpl(
    Subscribable.mapEffect(self.valueRef, Option.match({
        onSome: v => Option.map(PropertyPath.get(v, path), Option.some),
        onNone: () => Option.some(Option.none()),
    })),
    SubscriptionSubRef.makeFromPath(self.encodedValueRef, path),
    Subscribable.mapEffect(self.errorRef, Option.match({
        onSome: flow(
            ParseResult.ArrayFormatter.formatError,
            Effect.map(Array.filter(issue => PropertyPath.equivalence(issue.path, path))),
        ),
        onNone: () => Effect.succeed([]),
    })),
    Subscribable.map(self.validationFiberRef, Option.isSome),
    Subscribable.map(self.submitStateRef, AsyncData.isLoading)
)


export const FormFieldTypeId: unique symbol = Symbol.for("effect-fc/FormField")
export type FormFieldTypeId = typeof FormFieldTypeId

export interface FormField<in out A, in out I = A>
extends Pipeable.Pipeable {
    readonly [FormFieldTypeId]: FormFieldTypeId

    readonly valueSubscribable: Subscribable.Subscribable<Option.Option<A>, NoSuchElementException>
    readonly encodedValueRef: SubscriptionRef.SubscriptionRef<I>
    readonly issuesSubscribable: Subscribable.Subscribable<readonly ParseResult.ArrayFormatterIssue[]>
    readonly isValidatingSubscribable: Subscribable.Subscribable<boolean>
    readonly isSubmittingSubscribable: Subscribable.Subscribable<boolean>
}

class FormFieldImpl<in out A, in out I = A>
extends Pipeable.Class() implements FormField<A, I> {
    readonly [FormFieldTypeId]: FormFieldTypeId = FormFieldTypeId

    constructor(
        readonly valueSubscribable: Subscribable.Subscribable<Option.Option<A>, NoSuchElementException>,
        readonly encodedValueRef: SubscriptionRef.SubscriptionRef<I>,
        readonly issuesSubscribable: Subscribable.Subscribable<readonly ParseResult.ArrayFormatterIssue[]>,
        readonly isValidatingSubscribable: Subscribable.Subscribable<boolean>,
        readonly isSubmittingSubscribable: Subscribable.Subscribable<boolean>,
    ) {
        super()
    }
}

export const isFormField = (u: unknown): u is FormField<unknown, unknown> => Predicate.hasProperty(u, FormFieldTypeId)


export const useSubmit = <A, I, R, SA, SE, SR>(
    self: Form<A, I, R, SA, SE, SR>
): Effect.Effect<
    () => Promise<Option.Option<AsyncData.AsyncData<SA, SE>>>,
    never,
    SR
> => Component.useCallbackPromise(() => submit(self), [self])

export const useField = <A, I, R, SA, SE, SR, const P extends PropertyPath.Paths<NoInfer<I>>>(
    self: Form<A, I, R, SA, SE, SR>,
    path: P,
): FormField<
    PropertyPath.ValueFromPath<A, P>,
    PropertyPath.ValueFromPath<I, P>
// biome-ignore lint/correctness/useExhaustiveDependencies: individual path components need to be compared
> => React.useMemo(() => field(self, path), [self, ...path])

export namespace useInput {
    export interface Options {
        readonly debounce?: Duration.DurationInput
    }

    export interface Result<T> {
        readonly value: T
        readonly setValue: React.Dispatch<React.SetStateAction<T>>
    }
}

export const useInput: {
    <A, I>(
        field: FormField<A, I>,
        options?: useInput.Options,
    ): Effect.Effect<useInput.Result<I>, NoSuchElementException, Scope.Scope>
} = Effect.fnUntraced(function* <A, I>(
    field: FormField<A, I>,
    options?: useInput.Options,
) {
    const internalValueRef = yield* Component.useOnChange(() => Effect.tap(
        Effect.andThen(field.encodedValueRef, SubscriptionRef.make),
        internalValueRef => Effect.forkScoped(Effect.all([
            Stream.runForEach(
                Stream.drop(field.encodedValueRef, 1),
                upstreamEncodedValue => Effect.whenEffect(
                    Ref.set(internalValueRef, upstreamEncodedValue),
                    Effect.andThen(internalValueRef, internalValue => !Equal.equals(upstreamEncodedValue, internalValue)),
                ),
            ),

            Stream.runForEach(
                internalValueRef.changes.pipe(
                    Stream.drop(1),
                    Stream.changesWith(Equal.equivalence()),
                    options?.debounce ? Stream.debounce(options.debounce) : identity,
                ),
                internalValue => Ref.set(field.encodedValueRef, internalValue),
            ),
        ], { concurrency: "unbounded" })),
    ), [field, options?.debounce])

    const [value, setValue] = yield* SubscriptionRef.useSubscriptionRefState(internalValueRef)
    return { value, setValue }
})

export namespace useOptionalInput {
    export interface Options<T> extends useInput.Options {
        readonly defaultValue: T
    }

    export interface Result<T> extends useInput.Result<T> {
        readonly enabled: boolean
        readonly setEnabled: React.Dispatch<React.SetStateAction<boolean>>
    }
}

export const useOptionalInput: {
    <A, I>(
        field: FormField<A, Option.Option<I>>,
        options: useOptionalInput.Options<I>,
    ): Effect.Effect<useOptionalInput.Result<I>, NoSuchElementException, Scope.Scope>
} = Effect.fnUntraced(function* <A, I>(
    field: FormField<A, Option.Option<I>>,
    options: useOptionalInput.Options<I>,
) {
    const [enabledRef, internalValueRef] = yield* Component.useOnChange(() => Effect.tap(
        Effect.andThen(
            field.encodedValueRef,
            Option.match({
                onSome: v => Effect.all([SubscriptionRef.make(true), SubscriptionRef.make(v)]),
                onNone: () => Effect.all([SubscriptionRef.make(false), SubscriptionRef.make(options.defaultValue)]),
            }),
        ),

        ([enabledRef, internalValueRef]) => Effect.forkScoped(Effect.all([
            Stream.runForEach(
                Stream.drop(field.encodedValueRef, 1),

                upstreamEncodedValue => Effect.whenEffect(
                    Option.match(upstreamEncodedValue, {
                        onSome: v => Effect.andThen(
                            Ref.set(enabledRef, true),
                            Ref.set(internalValueRef, v),
                        ),
                        onNone: () => Effect.andThen(
                            Ref.set(enabledRef, false),
                            Ref.set(internalValueRef, options.defaultValue),
                        ),
                    }),

                    Effect.andThen(
                        Effect.all([enabledRef, internalValueRef]),
                        ([enabled, internalValue]) => !Equal.equals(upstreamEncodedValue, enabled ? Option.some(internalValue) : Option.none()),
                    ),
                ),
            ),

            Stream.runForEach(
                enabledRef.changes.pipe(
                    Stream.zipLatest(internalValueRef.changes),
                    Stream.drop(1),
                    Stream.changesWith(Equal.equivalence()),
                    options?.debounce ? Stream.debounce(options.debounce) : identity,
                ),
                ([enabled, internalValue]) => Ref.set(field.encodedValueRef, enabled ? Option.some(internalValue) : Option.none()),
            ),
        ], { concurrency: "unbounded" })),
    ), [field, options.debounce])

    const [enabled, setEnabled] = yield* SubscriptionRef.useSubscriptionRefState(enabledRef)
    const [value, setValue] = yield* SubscriptionRef.useSubscriptionRefState(internalValueRef)
    return { enabled, setEnabled, value, setValue }
})
