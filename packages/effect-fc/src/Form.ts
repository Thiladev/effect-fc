import { Array, Cause, Chunk, type Duration, Effect, Equal, Exit, Fiber, flow, Hash, HashMap, identity, Option, ParseResult, Pipeable, Predicate, Ref, Schema, type Scope, Stream } from "effect"
import type { NoSuchElementException } from "effect/Cause"
import type * as React from "react"
import * as Component from "./Component.js"
import * as PropertyPath from "./PropertyPath.js"
import * as Result from "./Result.js"
import * as Subscribable from "./Subscribable.js"
import * as SubscriptionRef from "./SubscriptionRef.js"
import * as SubscriptionSubRef from "./SubscriptionSubRef.js"


export const FormTypeId: unique symbol = Symbol.for("@effect-fc/Form/Form")
export type FormTypeId = typeof FormTypeId

export interface Form<in out A, in out I = A, out R = never, in out SA = void, in out SE = A, out SR = never, in out SP = never>
extends Pipeable.Pipeable {
    readonly [FormTypeId]: FormTypeId

    readonly schema: Schema.Schema<A, I, R>
    readonly onSubmit: (value: NoInfer<A>) => Effect.Effect<SA, SE, SR>
    readonly initialSubmitProgress: SP
    readonly autosubmit: boolean
    readonly debounce: Option.Option<Duration.DurationInput>

    readonly fieldCacheRef: Ref.Ref<HashMap.HashMap<FormFieldKey, FormField<unknown, unknown>>>
    readonly valueRef: SubscriptionRef.SubscriptionRef<Option.Option<A>>
    readonly encodedValueRef: SubscriptionRef.SubscriptionRef<I>
    readonly errorRef: SubscriptionRef.SubscriptionRef<Option.Option<ParseResult.ParseError>>
    readonly validationFiberRef: SubscriptionRef.SubscriptionRef<Option.Option<Fiber.Fiber<A, ParseResult.ParseError>>>
    readonly submitResultRef: SubscriptionRef.SubscriptionRef<Result.Result<SA, SE, SP>>

    readonly canSubmitSubscribable: Subscribable.Subscribable<boolean>
}

class FormImpl<in out A, in out I = A, out R = never, in out SA = void, in out SE = A, out SR = never, in out SP = never>
extends Pipeable.Class() implements Form<A, I, R, SA, SE, SR, SP> {
    readonly [FormTypeId]: FormTypeId = FormTypeId

    constructor(
        readonly schema: Schema.Schema<A, I, R>,
        readonly onSubmit: (value: NoInfer<A>) => Effect.Effect<SA, SE, SR>,
        readonly initialSubmitProgress: SP,
        readonly autosubmit: boolean,
        readonly debounce: Option.Option<Duration.DurationInput>,

        readonly fieldCacheRef: Ref.Ref<HashMap.HashMap<FormFieldKey, FormField<unknown, unknown>>>,
        readonly valueRef: SubscriptionRef.SubscriptionRef<Option.Option<A>>,
        readonly encodedValueRef: SubscriptionRef.SubscriptionRef<I>,
        readonly errorRef: SubscriptionRef.SubscriptionRef<Option.Option<ParseResult.ParseError>>,
        readonly validationFiberRef: SubscriptionRef.SubscriptionRef<Option.Option<Fiber.Fiber<A, ParseResult.ParseError>>>,
        readonly submitResultRef: SubscriptionRef.SubscriptionRef<Result.Result<SA, SE, SP>>,

        readonly canSubmitSubscribable: Subscribable.Subscribable<boolean>,
    ) {
        super()
    }
}

export const isForm = (u: unknown): u is Form<unknown, unknown, unknown, unknown, unknown, unknown> => Predicate.hasProperty(u, FormTypeId)

export namespace make {
    export interface Options<in out A, in out I, in out R, in out SA = void, in out SE = A, out SR = never, in out SP = never> {
        readonly schema: Schema.Schema<A, I, R>
        readonly initialEncodedValue: NoInfer<I>
        readonly onSubmit: (
            this: Form<NoInfer<A>, NoInfer<I>, NoInfer<R>, unknown, unknown, unknown>,
            value: NoInfer<A>,
        ) => Effect.Effect<SA, SE, Result.forkEffectPubSub.InputContext<SR, NoInfer<SP>>>
        readonly initialSubmitProgress?: SP
        readonly autosubmit?: boolean
        readonly debounce?: Duration.DurationInput
    }

    export type Success<A, I, R, SA = void, SE = A, SR = never, SP = never> = (
        Form<A, I, R, SA, SE, Exclude<SR, Result.Progress<any> | Result.Progress<never>>, SP>
    )
}

export const make = Effect.fnUntraced(function* <A, I = A, R = never, SA = void, SE = A, SR = never, SP = never>(
    options: make.Options<A, I, R, SA, SE, SR, SP>
): Effect.fn.Return<make.Success<A, I, R, SA, SE, SR, SP>> {
    const valueRef = yield* SubscriptionRef.make(Option.none<A>())
    const errorRef = yield* SubscriptionRef.make(Option.none<ParseResult.ParseError>())
    const validationFiberRef = yield* SubscriptionRef.make(Option.none<Fiber.Fiber<A, ParseResult.ParseError>>())
    const submitResultRef = yield* SubscriptionRef.make<Result.Result<SA, SE, SP>>(Result.initial())

    return new FormImpl(
        options.schema,
        options.onSubmit as any,
        options.initialSubmitProgress as SP,
        options.autosubmit ?? false,
        Option.fromNullable(options.debounce),

        yield* Ref.make(HashMap.empty<FormFieldKey, FormField<unknown, unknown>>()),
        valueRef,
        yield* SubscriptionRef.make(options.initialEncodedValue),
        errorRef,
        validationFiberRef,
        submitResultRef,

        Subscribable.map(
            Subscribable.zipLatestAll(valueRef, errorRef, validationFiberRef, submitResultRef),
            ([value, error, validationFiber, submitResult]) => (
                Option.isSome(value) &&
                Option.isNone(error) &&
                Option.isNone(validationFiber) &&
                !(Result.isRunning(submitResult) || Result.isRefreshing(submitResult))
            ),
        ),
    )
})

export const run = <A, I, R, SA, SE, SR, SP>(
    self: Form<A, I, R, SA, SE, SR, SP>
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
            Effect.forkScoped(Effect.onExit(
                Schema.decode(self.schema, { errors: "all" })(encodedValue),
                exit => Effect.andThen(
                    Exit.matchEffect(exit, {
                        onSuccess: v => Effect.andThen(
                            Ref.set(self.valueRef, Option.some(v)),
                            Ref.set(self.errorRef, Option.none()),
                        ),
                        onFailure: c => Option.match(Chunk.findFirst(Cause.failures(c), e => e._tag === "ParseError"), {
                            onSome: e => Ref.set(self.errorRef, Option.some(e)),
                            onNone: () => Effect.void,
                        }),
                    }),
                    Ref.set(self.validationFiberRef, Option.none()),
                ),
            )).pipe(
                Effect.tap(fiber => Ref.set(self.validationFiberRef, Option.some(fiber))),
                Effect.andThen(Fiber.join),
                Effect.andThen(() => self.autosubmit
                    ? Effect.asVoid(Effect.forkScoped(submit(self)))
                    : Effect.void
                ),
                Effect.forkScoped,
            )
        ),
    ),
)

export const submit = <A, I, R, SA, SE, SR, SP>(
    self: Form<A, I, R, SA, SE, SR, SP>
): Effect.Effect<
    Option.Option<Result.Result<SA, SE, SP>>,
    NoSuchElementException,
    Scope.Scope | SR
> => Effect.whenEffect(
    self.valueRef.pipe(
        Effect.andThen(identity),
        Effect.andThen(value => Result.forkEffectPubSub(
            self.onSubmit(value) as Effect.Effect<SA, SE, Result.forkEffectPubSub.InputContext<SR, SP>>,
            { initialProgress: self.initialSubmitProgress },
        )),
        Effect.andThen(identity),
        Effect.andThen(Stream.fromQueue),
        Stream.unwrapScoped,
        Stream.runFoldEffect(
            Result.initial() as Result.Result<SA, SE, SP>,
            (_, result) => Effect.as(Ref.set(self.submitResultRef, result), result),
        ),
        Effect.tap(result => Result.isFailure(result)
            ? Option.match(
                Chunk.findFirst(
                    Cause.failures(result.cause as Cause.Cause<ParseResult.ParseError>),
                    e => e._tag === "ParseError",
                ),
                {
                    onSome: e => Ref.set(self.errorRef, Option.some(e)),
                    onNone: () => Effect.void,
                },
            )
            : Effect.void
        ),
    ),

    self.canSubmitSubscribable.get,
)

export namespace service {
    export interface Options<in out A, in out I, in out R, in out SA = void, in out SE = A, out SR = never, in out SP = never>
    extends make.Options<A, I, R, SA, SE, SR, SP> {}

    export type Return<A, I, R, SA = void, SE = A, SR = never, SP = never> = Effect.Effect<
        Form<A, I, R, SA, SE, Exclude<SR, Result.Progress<any> | Result.Progress<never>>, SP>,
        never,
        Scope.Scope | R | Exclude<SR, Result.Progress<any> | Result.Progress<never>>
    >
}

export const service = <A, I = A, R = never, SA = void, SE = A, SR = never, SP = never>(
    options: service.Options<A, I, R, SA, SE, SR, SP>
): service.Return<A, I, R, SA, SE, SR, SP> => Effect.tap(
    make(options),
    form => Effect.forkScoped(run(form)),
)

export const field = <A, I, R, SA, SE, SR, SP, const P extends PropertyPath.Paths<NoInfer<I>>>(
    self: Form<A, I, R, SA, SE, SR, SP>,
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
    Subscribable.map(self.submitResultRef, result => Result.isRunning(result) || Result.isRefreshing(result)),
)


export const FormFieldTypeId: unique symbol = Symbol.for("@effect-fc/Form/FormField")
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

const FormFieldKeyTypeId: unique symbol = Symbol.for("@effect-fc/Form/FormFieldKey")
type FormFieldKeyTypeId = typeof FormFieldKeyTypeId

class FormFieldKey implements Equal.Equal {
    readonly [FormFieldKeyTypeId]: FormFieldKeyTypeId = FormFieldKeyTypeId
    constructor(readonly path: PropertyPath.PropertyPath) {}

    [Equal.symbol](that: Equal.Equal) {
        return isFormFieldKey(that) && PropertyPath.equivalence(this.path, that.path)
    }
    [Hash.symbol]() {
        return 0
    }
}

export const isFormField = (u: unknown): u is FormField<unknown, unknown> => Predicate.hasProperty(u, FormFieldTypeId)
const isFormFieldKey = (u: unknown): u is FormFieldKey => Predicate.hasProperty(u, FormFieldKeyTypeId)

export const makeFormField = <A, I, R, SA, SE, SR, SP, const P extends PropertyPath.Paths<NoInfer<I>>>(
    self: Form<A, I, R, SA, SE, SR, SP>,
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
    Subscribable.map(self.submitResultRef, result => Result.isRunning(result) || Result.isRefreshing(result)),
)


export namespace useInput {
    export interface Options {
        readonly debounce?: Duration.DurationInput
    }

    export interface Result<T> {
        readonly value: T
        readonly setValue: React.Dispatch<React.SetStateAction<T>>
    }
}

export const useInput = Effect.fnUntraced(function* <A, I>(
    field: FormField<A, I>,
    options?: useInput.Options,
): Effect.fn.Return<useInput.Result<I>, NoSuchElementException, Scope.Scope> {
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

export const useOptionalInput = Effect.fnUntraced(function* <A, I>(
    field: FormField<A, Option.Option<I>>,
    options: useOptionalInput.Options<I>,
): Effect.fn.Return<useOptionalInput.Result<I>, NoSuchElementException, Scope.Scope> {
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
