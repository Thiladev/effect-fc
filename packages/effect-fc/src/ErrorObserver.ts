import { type Cause, Context, Effect, Layer, type Queue, type Scope } from "effect"


export interface ErrorObserver<EIn, EOut> {
    readonly "~In": EIn
    readonly "~Out": EOut
    readonly "~Caught": Exclude<EIn, EOut>

    handle<A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, Exclude<E, Exclude<EIn, EOut>>, R>
    readonly subscribe: Effect.Effect<Queue.Dequeue<Cause.Cause<EIn>>, never, Scope.Scope>
}


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


export const ErrorObserver: Context.Tag<
    ErrorObserver<unknown, unknown>,
    ErrorObserver<unknown, unknown>
> = Context.GenericTag("@effect-fc/ErrorObserver/ErrorObserver")

export namespace Service {
    export interface Result<Self, Id extends string, EIn, EOut>
    extends Context.TagClass<Self, Id, ErrorObserver<EIn, EOut>> {
        readonly Default: Layer.Layer<Self>
    }
}

export const Service = <Self, EIn>() => (
    <const Id extends string, EOut>(
        id: Id,
        f: (
            self: Effect.Effect<never, NoInfer<EIn>>,
            actions: {
                failure(failure: NoInfer<EIn>): Effect.Effect<never>
                defect(defect: unknown): Effect.Effect<never>
            },
        ) => Effect.Effect<EOut>,
    ): Service.Result<Self, Id, EIn, EOut> => Layer.effect(
        ErrorObserver as Context.Tag<ErrorObserver<EIn, EOut>, ErrorObserver<EIn, EOut>>,
        Effect.gen(function*() {

        },
    ))
)
