import { Cause, Context, Data, Effect, Equal, Exit, Hash, Layer, Match, Option, Pipeable, Predicate, pipe, Queue, Ref, Scope } from "effect"


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

export const initial = (): Initial => Object.setPrototypeOf({ _tag: "Initial" }, ResultPrototype)
export const running = <P = never>(progress?: P): Running<P> => Object.setPrototypeOf({ _tag: "Running", progress }, ResultPrototype)
export const succeed = <A>(value: A): Success<A> => Object.setPrototypeOf({ _tag: "Success", value }, ResultPrototype)

export const fail = <E, A = never>(
    cause: Cause.Cause<E>,
    previousSuccess?: Success<A>,
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
    exit: Exit.Exit<A, E>
): Success<A> | Failure<A, E> => exit._tag === "Success"
    ? succeed(exit.value)
    : fail(exit.cause)

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


export interface Progress<P = never> {
    readonly update: <E, R>(
        f: (previous: P) => Effect.Effect<P, E, R>
    ) => Effect.Effect<void, PreviousResultNotRunningOrRefreshing | E, R>
}

export class PreviousResultNotRunningOrRefreshing extends Data.TaggedError("@effect-fc/Result/PreviousResultNotRunningOrRefreshing")<{
    readonly previous: Result<unknown, unknown, unknown>
}> {}

export const Progress = <P = never>(): Context.Tag<Progress<P>, Progress<P>> => Context.GenericTag("@effect-fc/Result/Progress")

export const makeProgressLayer = <A, E, P = never>(
    queue: Queue.Enqueue<Result<A, E, P>>,
    ref: Ref.Ref<Result<A, E, P>>,
): Layer.Layer<Progress<P>> => Layer.sync(Progress<P>(), () => ({
    update: <E, R>(f: (previous: P) => Effect.Effect<P, E, R>) => Effect.Do.pipe(
        Effect.bind("previous", () => Effect.andThen(
            ref,
            previous => isRunning(previous) || isRefreshing(previous)
                ? Effect.succeed(previous)
                : Effect.fail(new PreviousResultNotRunningOrRefreshing({ previous })),
        )),
        Effect.bind("progress", ({ previous }) => f(previous.progress)),
        Effect.let("next", ({ previous, progress }) => Object.setPrototypeOf(
            Object.assign({}, previous, { progress }),
            Object.getPrototypeOf(previous),
        )),
        Effect.tap(({ next }) => Ref.set(ref, next)),
        Effect.tap(({ next }) => Queue.offer(queue, next)),
        Effect.asVoid,
    ),
}))


export namespace forkEffectScoped {
    export type InputContext<R, P> = (R extends Progress<infer X>
        ? [X] extends [P]
            ? R
            : never
        : R
    )

    export interface Options<P> {
        readonly initialProgress?: P
    }

    export type OutputContext<R> = Scope.Scope | Exclude<R, Progress<any> | Progress<never>>
}

export const forkEffectScoped = <A, E, R, P = never>(
    effect: Effect.Effect<A, E, forkEffectScoped.InputContext<R, NoInfer<P>>>,
    options?: forkEffectScoped.Options<P>,
): Effect.Effect<
    Queue.Dequeue<Result<A, E, P>>,
    never,
    forkEffectScoped.OutputContext<R>
> => Effect.Do.pipe(
    Effect.bind("scope", () => Scope.Scope),
    Effect.bind("queue", () => Queue.unbounded<Result<A, E, P>>()),
    Effect.bind("ref", () => Ref.make<Result<A, E, P>>(initial())),
    Effect.tap(({ queue, ref }) => Effect.andThen(ref, v => Queue.offer(queue, v))),
    Effect.tap(({ scope, queue, ref }) => Effect.forkScoped(
        Effect.addFinalizer(() => Queue.shutdown(queue)).pipe(
            Effect.andThen(Effect.succeed(running(options?.initialProgress)).pipe(
                Effect.tap(v => Ref.set(ref, v)),
                Effect.tap(v => Queue.offer(queue, v)),
            )),
            Effect.andThen(Effect.provideService(effect, Scope.Scope, scope)),
            Effect.exit,
            Effect.andThen(exit => Effect.succeed(fromExit(exit)).pipe(
                Effect.tap(v => Ref.set(ref, v)),
                Effect.tap(v => Queue.offer(queue, v)),
            )),
            Effect.scoped,
            Effect.provide(makeProgressLayer(queue, ref)),
        )
    )),
    Effect.map(({ queue }) => queue),
) as Effect.Effect<Queue.Queue<Result<A, E, P>>, never, Scope.Scope>
