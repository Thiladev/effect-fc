import { Cause, Exit, Option, Pipeable, Predicate } from "effect"


export const TypeId: unique symbol = Symbol.for("@effect-fc/Result/Result")
export type TypeId = typeof TypeId

export type Result<A, E = never, P = never> = (
    | Initial
    | Running<P>
    | Success<A>
    | (Success<A> & Refreshing<P>)
    | Failure<A, E>
    | (Failure<A, E> & Refreshing<P>)
)

export namespace Result {
    export interface Prototype extends Pipeable.Pipeable {
        readonly [TypeId]: TypeId
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
    [TypeId]: TypeId,
} as const satisfies Result.Prototype)


export const isResult = (u: unknown): u is Result<unknown, unknown, unknown> => Predicate.hasProperty(u, TypeId)
export const isInitial = (u: unknown): u is Initial => isResult(u) && u._tag === "Initial"
export const isSuccess = (u: unknown): u is Success<unknown> => isResult(u) && u._tag === "Success"
export const isFailure = (u: unknown): u is Failure<unknown, unknown> => isResult(u) && u._tag === "Failure"
export const isRefreshing = (u: unknown): u is Refreshing<unknown> => isResult(u) && Predicate.hasProperty(u, "refreshing") && u.refreshing

export const initial = (): Initial => Object.setPrototypeOf({}, ResultPrototype)
export const running = <P = never>(progress?: P): Running<P> => Object.setPrototypeOf({ progress }, ResultPrototype)
export const success = <A>(value: A): Success<A> => Object.setPrototypeOf({ value }, ResultPrototype)
export const failure = <E, A = never>(
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
    ? success(exit.value)
    : failure(exit.cause)

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
