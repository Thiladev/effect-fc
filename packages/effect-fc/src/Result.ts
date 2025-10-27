import { Cause, Effect, Equal, Exit, Hash, Match, Option, Pipeable, Predicate, pipe, Queue, type Scope } from "effect"


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
export const isRunning = (u: unknown): u is Running => isResult(u) && u._tag === "Running"
export const isSuccess = (u: unknown): u is Success<unknown> => isResult(u) && u._tag === "Success"
export const isFailure = (u: unknown): u is Failure<unknown, unknown> => isResult(u) && u._tag === "Failure"
export const isRefreshing = (u: unknown): u is Refreshing<unknown> => isResult(u) && Predicate.hasProperty(u, "refreshing") && u.refreshing

export const initial = (): Initial => Object.setPrototypeOf({}, ResultPrototype)
export const running = <P = never>(progress?: P): Running<P> => Object.setPrototypeOf({ progress }, ResultPrototype)
export const succeed = <A>(value: A): Success<A> => Object.setPrototypeOf({ value }, ResultPrototype)
export const fail = <E, A = never>(
    cause: Cause.Cause<E>,
    previousSuccess?: Success<A>,
): Failure<A, E> => Object.setPrototypeOf({
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

export const forkEffect = <A, E, R>(
    effect: Effect.Effect<A, E, R>
): Effect.Effect<Queue.Dequeue<Result<A, E>>, never, Scope.Scope | R> => Queue.unbounded<Result<A, E>>().pipe(
    Effect.tap(Queue.offer(initial())),
    Effect.tap(queue => Effect.forkScoped(Queue.offer(queue, running()).pipe(
        Effect.andThen(effect),
        Effect.exit,
        Effect.andThen(exit => Queue.offer(queue, fromExit(exit))),
        Effect.andThen(Queue.shutdown(queue)),
    ))),
)
