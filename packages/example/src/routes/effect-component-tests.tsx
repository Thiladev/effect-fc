import { Box, TextField } from "@radix-ui/themes"
import { createFileRoute } from "@tanstack/react-router"
import { Array, Console, Effect, Layer, pipe, Ref, Runtime, SubscriptionRef } from "effect"
import { ReactComponent, ReactHook, ReactManagedRuntime } from "effect-components"


const LogLive = Layer.scopedDiscard(Effect.acquireRelease(
    Console.log("Runtime built."),
    () => Console.log("Runtime destroyed."),
))

class TestService extends Effect.Service<TestService>()("TestService", {
    effect: Effect.bind(Effect.Do, "ref", () => SubscriptionRef.make("value")),
}) {}

class SubService extends Effect.Service<SubService>()("SubService", {
    effect: Effect.bind(Effect.Do, "ref", () => SubscriptionRef.make("subvalue")),
}) {}

const runtime = ReactManagedRuntime.make(Layer.empty.pipe(
    Layer.provideMerge(LogLive),
    Layer.provideMerge(TestService.Default),
))


export const Route = createFileRoute("/effect-component-tests")({
    component: RouteComponent,
})

function RouteComponent() {
    return (
        <ReactManagedRuntime.AsyncProvider runtime={runtime}>
            <MyRoute />
        </ReactManagedRuntime.AsyncProvider>
    )
}

const MyRoute = pipe(
    Effect.fn(function*() {
        const runtime = yield* Effect.runtime()

        const service = yield* TestService
        const [value] = yield* ReactHook.useSubscribeRefs(service.ref)

        // const MyTestComponentFC = yield* Effect.provide(
        //     ReactComponent.useFC(MyTestComponent),
        //     yield* ReactHook.useMemoLayer(SubService.Default),
        // )

        return <>
            <Box>
                <TextField.Root
                    value={value}
                    onChange={e => Runtime.runSync(runtime)(Ref.set(service.ref, e.target.value))}
                />
            </Box>

            {/* {yield* ReactComponent.use(MyTestComponent, C => <C />).pipe(
                Effect.provide(yield* ReactHook.useMemoLayer(SubService.Default))
            )} */}

            {/* {Array.range(0, 3).map(k =>
                <MyTestComponentFC key={k} />
            )} */}

            {yield* pipe(
                Array.range(0, 3),
                Array.map(k => ReactComponent.use(MyTestComponent, FC =>
                    <FC key={k} />
                )),
                Effect.all,
                Effect.provide(yield* ReactHook.useMemoLayer(SubService.Default)),
            )}
        </>
    }),

    ReactComponent.withDisplayName("MyRoute"),
    ReactComponent.withRuntime(runtime.context),
)


const MyTestComponent = pipe(
    Effect.fn(function*() {
        const runtime = yield* Effect.runtime()

        const service = yield* SubService
        const [value] = yield* ReactHook.useSubscribeRefs(service.ref)

        // yield* ReactHook.useMemo(() => Effect.andThen(
        //     Effect.addFinalizer(() => Console.log("MyTestComponent umounted")),
        //     Console.log("MyTestComponent mounted"),
        // ), [])

        return <>
            <Box>
                <TextField.Root
                    value={value}
                    onChange={e => Runtime.runSync(runtime)(Ref.set(service.ref, e.target.value))}
                />
            </Box>
        </>
    }),

    ReactComponent.withDisplayName("MyTestComponent"),
)
