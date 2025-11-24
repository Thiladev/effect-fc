import { Cause, Context, Data, Effect, Equal, Exit, type Fiber, Hash, Layer, Match, Option, Pipeable, Predicate, PubSub, pipe, Ref, type Scope, Stream, Subscribable } from "effect"


export const ResultTypeId: unique symbol = Symbol.for("@effect-fc/Result/Result")
export type ResultTypeId = typeof ResultTypeId

export type Result<A, E = never, P = never> = (
    | Initial
    | Running<P>
    | Success<A>
    | (Success<A> & Refreshing<P>)
    | Failure<A, E>
    | (Failure<A, E> & Refreshing<P>)
)

export namespace Result {
    export interface Prototype extends Pipeable.Pipeable, Equal.Equal {
        readonly [ResultTypeId]: ResultTypeId
    }

    export type Success<R extends Result<any, any, any>> = [R] extends [Result<infer A, infer _E, infer _P>] ? A : never
    export type Failure<R extends Result<any, any, any>> = [R] extends [Result<infer _A, infer E, infer _P>] ? E : never
    export type Progress<R extends Result<any, any, any>> = [R] extends [Result<infer _A, infer _E, infer P>] ? P : never
}

export interface Initial extends Result.Prototype {
    readonly _tag: "Initial"
}

export interface Running<P = never> extends Result.Prototype {
    readonly _tag: "Running"
    readonly progress: P
}

export interface Success<A> extends Result.Prototype {
    readonly _tag: "Success"
    readonly value: A
}

export interface Failure<A, E = never> extends Result.Prototype {
    readonly _tag: "Failure"
    readonly cause: Cause.Cause<E>
    readonly previousSuccess: Option.Option<Success<A>>
}

export interface Refreshing<P = never> {
    readonly refreshing: true
    readonly progress: P
}


const ResultPrototype = Object.freeze({
    ...Pipeable.Prototype,
    [ResultTypeId]: ResultTypeId,

    [Equal.symbol](this: Result<any, any, any>, that: Result<any, any, any>): boolean {
        if (this._tag !== that._tag)
            return false

        return Match.value(this).pipe(
            Match.tag("Initial", () => true),
            Match.tag("Running", self => Equal.equals(self.progress, (that as Running<any>).progress)),
            Match.tag("Success", self =>
                Equal.equals(self.value, (that as Success<any>).value) &&
                (isRefreshing(self) ? self.refreshing : false) === (isRefreshing(that) ? that.refreshing : false) &&
                Equal.equals(isRefreshing(self) ? self.progress : undefined, isRefreshing(that) ? that.progress : undefined)
            ),
            Match.tag("Failure", self =>
                Equal.equals(self.cause, (that as Failure<any, any>).cause) &&
                (isRefreshing(self) ? self.refreshing : false) === (isRefreshing(that) ? that.refreshing : false) &&
                Equal.equals(isRefreshing(self) ? self.progress : undefined, isRefreshing(that) ? that.progress : undefined)
            ),
            Match.exhaustive,
        )
    },

    [Hash.symbol](this: Result<any, any, any>): number {
        const tagHash = Hash.string(this._tag)

        return Match.value(this).pipe(
            Match.tag("Initial", () => tagHash),
            Match.tag("Running", self => Hash.combine(Hash.hash(self.progress))(tagHash)),
            Match.tag("Success", self => pipe(tagHash,
                Hash.combine(Hash.hash(self.value)),
                Hash.combine(Hash.hash(isRefreshing(self) ? self.progress : undefined)),
            )),
            Match.tag("Failure", self => pipe(tagHash,
                Hash.combine(Hash.hash(self.cause)),
                Hash.combine(Hash.hash(isRefreshing(self) ? self.progress : undefined)),
            )),
            Match.exhaustive,
            Hash.cached(this),
        )
    },
} as const satisfies Result.Prototype)


export const isResult = (u: unknown): u is Result<unknown, unknown, unknown> => Predicate.hasProperty(u, ResultTypeId)
export const isInitial = (u: unknown): u is Initial => isResult(u) && u._tag === "Initial"
export const isRunning = (u: unknown): u is Running<unknown> => isResult(u) && u._tag === "Running"
export const isSuccess = (u: unknown): u is Success<unknown> => isResult(u) && u._tag === "Success"
export const isFailure = (u: unknown): u is Failure<unknown, unknown> => isResult(u) && u._tag === "Failure"
export const isRefreshing = (u: unknown): u is Refreshing<unknown> => isResult(u) && Predicate.hasProperty(u, "refreshing") && u.refreshing

export const initial: {
    (): Initial
    <A, E = never, P = never>(): Result<A, E, P>
} = (): Initial => Object.setPrototypeOf({ _tag: "Initial" }, ResultPrototype)
export const running = <P = never>(progress?: P): Running<P> => Object.setPrototypeOf({ _tag: "Running", progress }, ResultPrototype)
export const succeed = <A>(value: A): Success<A> => Object.setPrototypeOf({ _tag: "Success", value }, ResultPrototype)

export const fail = <E, A = never>(
    cause: Cause.Cause<E>,
    previousSuccess?: Success<NoInfer<A>>,
): Failure<A, E> => Object.setPrototypeOf({
    _tag: "Failure",
    cause,
    previousSuccess: Option.fromNullable(previousSuccess),
}, ResultPrototype)
export const refreshing = <R extends Success<any> | Failure<any, any>, P = never>(
    result: R,
    progress?: P,
): Omit<R, keyof Refreshing<Result.Progress<R>>> & Refreshing<P> => Object.setPrototypeOf(
    Object.assign({}, result, { progress }),
    Object.getPrototypeOf(result),
)

export const fromExit = <A, E>(
    exit: Exit.Exit<A, E>,
    previousSuccess?: Success<NoInfer<A>>,
): Success<A> | Failure<A, E> => exit._tag === "Success"
    ? succeed(exit.value)
    : fail(exit.cause, previousSuccess)

export const toExit = <A, E, P>(
    self: Result<A, E, P>
): Exit.Exit<A, E | Cause.NoSuchElementException> => {
    switch (self._tag) {
        case "Success":
            return Exit.succeed(self.value)
        case "Failure":
            return Exit.failCause(self.cause)
        default:
            return Exit.fail(new Cause.NoSuchElementException())
    }
}


export interface State<A, E = never, P = never> {
    readonly get: Effect.Effect<Result<A, E, P>>
    readonly set: (v: Result<A, E, P>) => Effect.Effect<void>
}

export const State = <A, E = never, P = never>(): Context.Tag<State<A, E, P>, State<A, E, P>> => Context.GenericTag("@effect-fc/Result/State")

export interface Progress<P = never> {
    readonly update: <E, R>(
        f: (previous: P) => Effect.Effect<P, E, R>
    ) => Effect.Effect<void, PreviousResultNotRunningNorRefreshing | E, R>
}

export class PreviousResultNotRunningNorRefreshing extends Data.TaggedError("@effect-fc/Result/PreviousResultNotRunningNorRefreshing")<{
    readonly previous: Result<unknown, unknown, unknown>
}> {}

export const Progress = <P = never>(): Context.Tag<Progress<P>, Progress<P>> => Context.GenericTag("@effect-fc/Result/Progress")

export const makeProgressLayer = <A, E, P = never>(): Layer.Layer<
    Progress<P>,
    never,
    State<A, E, P>
> => Layer.effect(Progress<P>(), Effect.gen(function*() {
    const state = yield* State<A, E, P>()

    return {
        update: <E, R>(f: (previous: P) => Effect.Effect<P, E, R>) => Effect.Do.pipe(
            Effect.bind("previous", () => Effect.andThen(state.get, previous =>
                isRunning(previous) || isRefreshing(previous)
                    ? Effect.succeed(previous)
                    : Effect.fail(new PreviousResultNotRunningNorRefreshing({ previous })),
            )),
            Effect.bind("progress", ({ previous }) => f(previous.progress)),
            Effect.let("next", ({ previous, progress }) => Object.setPrototypeOf(
                Object.assign({}, previous, { progress }),
                Object.getPrototypeOf(previous),
            )),
            Effect.andThen(({ next }) => state.set(next)),
        ),
    }
}))


export namespace unsafeForkEffect {
    export type OutputContext<A, E, R, P> = Exclude<R, State<A, E, P> | Progress<P> | Progress<never>>

    export type Options<A, E, P> = {
        readonly initialProgress?: P
        readonly previous?: Success<A> | Failure<A, E>
    } & (
        | {
            readonly refreshing: true
            readonly previous: Success<A> | Failure<A, E>
        }
        | {
            readonly refreshing?: false
        }
    )
}

export const unsafeForkEffect = <A, E, R, P = never>(
    effect: Effect.Effect<A, E, R>,
    options?: unsafeForkEffect.Options<NoInfer<A>, NoInfer<E>, P>,
): Effect.Effect<
    readonly [result: Subscribable.Subscribable<Result<A, E, P>, never, never>, fiber: Fiber.Fiber<A, E>],
    never,
    Scope.Scope | unsafeForkEffect.OutputContext<A, E, R, P>
> => Effect.Do.pipe(
    Effect.bind("ref", () => Ref.make(initial<A, E, P>())),
    Effect.bind("pubsub", () => PubSub.unbounded<Result<A, E, P>>()),
    Effect.bind("fiber", ({ ref, pubsub }) => Effect.forkScoped(State<A, E, P>().pipe(
        Effect.andThen(state => state.set(options?.refreshing
            ? refreshing(options.previous, options?.initialProgress) as Result<A, E, P>
            : running(options?.initialProgress)
        ).pipe(
            Effect.andThen(effect),
            Effect.onExit(exit => Effect.andThen(
                state.set(fromExit(exit, (options?.previous && isSuccess(options.previous)) ? options.previous : undefined)),
                Effect.forkScoped(PubSub.shutdown(pubsub)),
            )),
        )),
        Effect.provide(Layer.empty.pipe(
            Layer.provideMerge(makeProgressLayer<A, E, P>()),
            Layer.provideMerge(Layer.succeed(State<A, E, P>(), {
                get: ref,
                set: v => Effect.andThen(Ref.set(ref, v), PubSub.publish(pubsub, v))
            })),
        )),
    ))),
    Effect.map(({ ref, pubsub, fiber }) => [
        Subscribable.make({
            get: ref,
            changes: Stream.unwrapScoped(Effect.map(
                Effect.all([ref, Stream.fromPubSub(pubsub, { scoped: true })]),
                ([latest, stream]) => Stream.concat(Stream.make(latest), stream),
            )),
        }),
        fiber,
    ]),
) as Effect.Effect<
    readonly [result: Subscribable.Subscribable<Result<A, E, P>, never, never>, fiber: Fiber.Fiber<A, E>],
    never,
    Scope.Scope | unsafeForkEffect.OutputContext<A, E, R, P>
>

export namespace forkEffect {
    export type InputContext<R, P> = R extends Progress<infer X> ? [X] extends [P] ? R : never : R
    export type OutputContext<A, E, R, P> = unsafeForkEffect.OutputContext<A, E, R, P>
    export type Options<A, E, P> = unsafeForkEffect.Options<A, E, P>
}

export const forkEffect: {
    <A, E, R, P = never>(
        effect: Effect.Effect<A, E, forkEffect.InputContext<R, NoInfer<P>>>,
        options?: forkEffect.Options<NoInfer<A>, NoInfer<E>, P>,
    ): Effect.Effect<
        readonly [result: Subscribable.Subscribable<Result<A, E, P>, never, never>, fiber: Fiber.Fiber<A, E>],
        never,
        Scope.Scope | forkEffect.OutputContext<A, E, R, P>
    >
} = unsafeForkEffect
