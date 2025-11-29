import { Array, Cause, Chunk, type Context, type Duration, Effect, Equal, Exit, Fiber, flow, Hash, HashMap, identity, Option, ParseResult, Pipeable, Predicate, Ref, Schema, type Scope, Stream } from "effect"
import type * as React from "react"
import * as Component from "./Component.js"
import type * as Mutation from "./Mutation.js"
import * as PropertyPath from "./PropertyPath.js"
import * as Result from "./Result.js"
import * as Subscribable from "./Subscribable.js"
import * as SubscriptionRef from "./SubscriptionRef.js"
import * as SubscriptionSubRef from "./SubscriptionSubRef.js"


export const FormTypeId: unique symbol = Symbol.for("@effect-fc/Form/Form")
export type FormTypeId = typeof FormTypeId

export interface Form<in out A, in out MA, in out I = A, in out R = never, in out ME = never, in out MR = never, in out MP = never>
extends Pipeable.Pipeable {
    readonly [FormTypeId]: FormTypeId

    readonly schema: Schema.Schema<A, I, R>
    readonly context: Context.Context<Scope.Scope | R>
    readonly mutation: Mutation.Mutation<readonly [value: A], MA, ME, MR, MP>
    readonly autosubmit: boolean
    readonly debounce: Option.Option<Duration.DurationInput>

    readonly value: Subscribable.Subscribable<Option.Option<A>>
    readonly encodedValue: Subscribable.Subscribable<I>
    readonly error: Subscribable.Subscribable<Option.Option<ParseResult.ParseError>>
    readonly validationFiber: Subscribable.Subscribable<Option.Option<Fiber.Fiber<A, ParseResult.ParseError>>>

    readonly canSubmit: Subscribable.Subscribable<boolean>

    readonly submit: Effect.Effect<Option.Option<Result.Final<MA, ME, MP>>, Cause.NoSuchElementException>
}

export class FormImpl<in out A, in out MA, in out I = A, in out R = never, in out ME = never, in out MR = never, in out MP = never>
extends Pipeable.Class() implements Form<A, MA, I, R, ME, MR, MP> {
    readonly [FormTypeId]: FormTypeId = FormTypeId

    constructor(
        readonly schema: Schema.Schema<A, I, R>,
        readonly mutation: Mutation.Mutation<readonly [value: A], MA, ME, MR, MP>,
        readonly autosubmit: boolean,
        readonly debounce: Option.Option<Duration.DurationInput>,

        readonly value: SubscriptionRef.SubscriptionRef<Option.Option<A>>,
        readonly encodedValue: SubscriptionRef.SubscriptionRef<I>,
        readonly error: SubscriptionRef.SubscriptionRef<Option.Option<ParseResult.ParseError>>,
        readonly validationFiber: SubscriptionRef.SubscriptionRef<Option.Option<Fiber.Fiber<A, ParseResult.ParseError>>>,

        readonly runSemaphore: Effect.Semaphore,
        readonly fieldCache: Ref.Ref<HashMap.HashMap<FormFieldKey, FormField<unknown, unknown>>>,
    ) {
        super()
    }

    get canSubmit(): Subscribable.Subscribable<boolean> {
        return Subscribable.map(
            Subscribable.zipLatestAll(this.value, this.error, this.validationFiber, this.mutation.result),
            ([value, error, validationFiber, submitResult]) => (
                Option.isSome(value) &&
                Option.isNone(error) &&
                Option.isNone(validationFiber) &&
                !(Result.isRunning(submitResult) || Result.isRefreshing(submitResult))
            ),
        )
    }

    get submit(): Effect.Effect<Option.Option<Result.Final<MA, ME, MP>>, Cause.NoSuchElementException> {
        return Effect.whenEffect(
            this.value.pipe(
                Effect.andThen(identity),
                Effect.andThen(value => this.mutation.mutate([value])),
                Effect.tap(result => Result.isFailure(result)
                    ? Option.match(
                        Chunk.findFirst(
                            Cause.failures(result.cause as Cause.Cause<ParseResult.ParseError>),
                            e => e._tag === "ParseError",
                        ),
                        {
                            onSome: e => Ref.set(this.error, Option.some(e)),
                            onNone: () => Effect.void,
                        },
                    )
                    : Effect.void
                ),
            ),

            this.canSubmit.get,
        )
    }
}

export const isForm = (u: unknown): u is Form<unknown, unknown, unknown, unknown, unknown, unknown> => Predicate.hasProperty(u, FormTypeId)

export namespace make {
    export interface Options<in out A, in out MA, in out I = A, in out R = never, in out ME = never, in out MR = never, in out MP = never> {
        readonly schema: Schema.Schema<A, I, R>
        readonly initialEncodedValue: NoInfer<I>
        readonly onSubmit: (
            this: Form<NoInfer<A>, NoInfer<I>, NoInfer<R>, unknown, unknown, unknown>,
            value: NoInfer<A>,
        ) => Effect.Effect<SA, SE, Result.forkEffect.InputContext<SR, NoInfer<SP>>>
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

    return new FormImpl(
        options.schema,
        options.autosubmit ?? false,
        Option.fromNullable(options.debounce),

        yield* Ref.make(HashMap.empty<FormFieldKey, FormField<unknown, unknown>>()),
        valueRef,
        yield* SubscriptionRef.make(options.initialEncodedValue),
        errorRef,
        validationFiberRef,
    )
})

export const run = <A, MA, I, R, ME, MR, MP>(
    self: Form<A, MA, I, R, ME, MR, MP>
): Effect.Effect<void> => {
    const _self = self as FormImpl<A, MA, I, R, ME, MR, MP>
    return _self.runSemaphore.withPermits(1)(Stream.runForEach(
        _self.encodedValue.changes.pipe(
            Option.isSome(self.debounce) ? Stream.debounce(self.debounce.value) : identity
        ),

        encodedValue => _self.validationFiber.pipe(
            Effect.andThen(Option.match({
                onSome: Fiber.interrupt,
                onNone: () => Effect.void,
            })),
            Effect.andThen(
                Effect.forkScoped(Effect.onExit(
                    Schema.decode(_self.schema, { errors: "all" })(encodedValue),
                    exit => Effect.andThen(
                        Exit.matchEffect(exit, {
                            onSuccess: v => Effect.andThen(
                                Ref.set(_self.value, Option.some(v)),
                                Ref.set(_self.error, Option.none()),
                            ),
                            onFailure: c => Option.match(Chunk.findFirst(Cause.failures(c), e => e._tag === "ParseError"), {
                                onSome: e => Ref.set(_self.error, Option.some(e)),
                                onNone: () => Effect.void,
                            }),
                        }),
                        Ref.set(_self.validationFiber, Option.none()),
                    ),
                )).pipe(
                    Effect.tap(fiber => Ref.set(_self.validationFiber, Option.some(fiber))),
                    Effect.andThen(Fiber.join),
                    Effect.andThen(() => self.autosubmit
                        ? Effect.asVoid(Effect.forkScoped(submit(self)))
                        : Effect.void
                    ),
                    Effect.forkScoped,
                )
            ),
        ),
    ))
}

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
): Effect.Effect<FormField<PropertyPath.ValueFromPath<A, P>, PropertyPath.ValueFromPath<I, P>>> => self.fieldCacheRef.pipe(
    Effect.map(HashMap.get(new FormFieldKey(path))),
    Effect.flatMap(Option.match({
        onSome: v => Effect.succeed(v as FormField<PropertyPath.ValueFromPath<A, P>, PropertyPath.ValueFromPath<I, P>>),
        onNone: () => Effect.tap(
            Effect.succeed(makeFormField(self, path)),
            v => Ref.update(self.fieldCacheRef, HashMap.set(new FormFieldKey(path), v as FormField<unknown, unknown>)),
        ),
    })),
)


export const FormFieldTypeId: unique symbol = Symbol.for("@effect-fc/Form/FormField")
export type FormFieldTypeId = typeof FormFieldTypeId

export interface FormField<in out A, in out I = A>
extends Pipeable.Pipeable {
    readonly [FormFieldTypeId]: FormFieldTypeId

    readonly value: Subscribable.Subscribable<Option.Option<A>, Cause.NoSuchElementException>
    readonly encodedValue: SubscriptionRef.SubscriptionRef<I>
    readonly issues: Subscribable.Subscribable<readonly ParseResult.ArrayFormatterIssue[]>
    readonly isValidating: Subscribable.Subscribable<boolean>
    readonly isSubmitting: Subscribable.Subscribable<boolean>
}

class FormFieldImpl<in out A, in out I = A>
extends Pipeable.Class() implements FormField<A, I> {
    readonly [FormFieldTypeId]: FormFieldTypeId = FormFieldTypeId

    constructor(
        readonly value: Subscribable.Subscribable<Option.Option<A>, Cause.NoSuchElementException>,
        readonly encodedValue: SubscriptionRef.SubscriptionRef<I>,
        readonly issues: Subscribable.Subscribable<readonly ParseResult.ArrayFormatterIssue[]>,
        readonly isValidating: Subscribable.Subscribable<boolean>,
        readonly isSubmitting: Subscribable.Subscribable<boolean>,
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

export const makeFormField = <A, MA, I, R, ME, MR, MP, const P extends PropertyPath.Paths<NoInfer<I>>>(
    self: Form<A, MA, I, R, ME, MR, MP>,
    path: P,
): FormField<PropertyPath.ValueFromPath<A, P>, PropertyPath.ValueFromPath<I, P>> => {
    const _self = self as FormImpl<A, MA, I, R, ME, MR, MP>
    return new FormFieldImpl(
        Subscribable.mapEffect(_self.value, Option.match({
            onSome: v => Option.map(PropertyPath.get(v, path), Option.some),
            onNone: () => Option.some(Option.none()),
        })),
        SubscriptionSubRef.makeFromPath(_self.encodedValue, path),
        Subscribable.mapEffect(_self.error, Option.match({
            onSome: flow(
                ParseResult.ArrayFormatter.formatError,
                Effect.map(Array.filter(issue => PropertyPath.equivalence(issue.path, path))),
            ),
            onNone: () => Effect.succeed([]),
        })),
        Subscribable.map(_self.validationFiber, Option.isSome),
        Subscribable.map(_self.mutation.result, result => Result.isRunning(result) || Result.isRefreshing(result)),
    )
}


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
