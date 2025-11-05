import { type Cause, Context, type Effect, Layer, type Queue, type Scope } from "effect"


export interface ErrorObserver<E = never> {
    handle<Eff extends Effect.Effect<any, any, any>>(effect: Eff): Eff
    readonly subscribe: Effect.Effect<Queue.Dequeue<Cause.Cause<E>>, never, Scope.Scope>
}

export const ErrorObserver = <E = never>(): Context.Tag<ErrorObserver<E>, ErrorObserver<E>> => Context.GenericTag("@effect-fc/ErrorObserver/ErrorObserver")


export namespace make {
    export type Handler<EIn, EOut> = (
        self: Effect.Effect<never, NoInfer<EIn>>,
        push: {
            failure(failure: NoInfer<EIn>): Effect.Effect<never>
            defect(defect: unknown): Effect.Effect<never>
        },
    ) => Effect.Effect<EOut>
}

export const make = <EIn = never>() => <EOut>(
    f: make.Handler<NoInfer<EIn>, EOut>
): Effect.Effect<ErrorObserver<EIn, EOut>> =>
