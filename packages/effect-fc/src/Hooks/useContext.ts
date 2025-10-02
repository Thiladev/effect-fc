import { type Context, Effect, Layer, ManagedRuntime, Scope } from "effect"
import type { ScopeOptions } from "./ScopeOptions.js"
import { useMemo } from "./useMemo.js"
import { useScope } from "./useScope.js"


export const useContext: {
    <ROut, E, RIn>(
        layer: Layer.Layer<ROut, E, RIn>,
        options?: ScopeOptions,
    ): Effect.Effect<Context.Context<ROut>, E, RIn>
} = Effect.fnUntraced(function* <ROut, E, RIn>(
    layer: Layer.Layer<ROut, E, RIn>,
    options?: ScopeOptions,
) {
    const scope = yield* useScope([layer], options)

    return yield* useMemo(() => Effect.context<RIn>().pipe(
        Effect.map(context => ManagedRuntime.make(Layer.provide(layer, Layer.succeedContext(context)))),
        Effect.tap(runtime => Effect.addFinalizer(() => runtime.disposeEffect)),
        Effect.andThen(runtime => runtime.runtimeEffect),
        Effect.andThen(runtime => runtime.context),
        Effect.provideService(Scope.Scope, scope),
    ), [scope])
})
