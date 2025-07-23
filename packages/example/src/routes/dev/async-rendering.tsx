import { runtime } from "@/runtime"
import { Flex, Text, TextField } from "@radix-ui/themes"
import { createFileRoute } from "@tanstack/react-router"
import { GetRandomValues, makeUuid4 } from "@typed/id"
import { Effect } from "effect"
import { Component, Hook, Memoized, Suspense } from "effect-fc"
import * as React from "react"


// Generator version
const RouteComponent = Component.make(function* AsyncRendering() {
    const MemoizedAsyncComponentFC = yield* MemoizedAsyncComponent
    const AsyncComponentFC = yield* AsyncComponent
    const [input, setInput] = React.useState("")

    return (
        <Flex direction="column" align="stretch" gap="2">
            <TextField.Root
                value={input}
                onChange={e => setInput(e.target.value)}
            />

            <MemoizedAsyncComponentFC fallback={React.useMemo(() => <p>Loading memoized...</p>, [])} />
            <AsyncComponentFC />
        </Flex>
    )
}).pipe(
    Component.withRuntime(runtime.context)
)

// Pipeline version
// const RouteComponent = Component.make("RouteComponent")(() => Effect.Do,
//     Effect.bind("VMemoizedAsyncComponent", () => Component.useFC(MemoizedAsyncComponent)),
//     Effect.bind("VAsyncComponent", () => Component.useFC(AsyncComponent)),
//     Effect.let("input", () => React.useState("")),

//     Effect.map(({ input: [input, setInput], VAsyncComponent, VMemoizedAsyncComponent }) =>
//         <Flex direction="column" align="stretch" gap="2">
//             <TextField.Root
//                 value={input}
//                 onChange={e => setInput(e.target.value)}
//             />

//             <VMemoizedAsyncComponent />
//             <VAsyncComponent />
//         </Flex>
//     ),
// ).pipe(
//     Component.withRuntime(runtime.context)
// )


class AsyncComponent extends Component.make(function* AsyncComponent() {
    const SubComponentFC = yield* SubComponent

    yield* Effect.sleep("500 millis") // Async operation
    // Cannot use React hooks after the async operation

    return (
        <Flex direction="column" align="stretch">
            <Text>Rendered!</Text>
            <SubComponentFC />
        </Flex>
    )
}).pipe(
    Suspense.suspense,
    Suspense.withOptions({ defaultFallback: <p>Loading...</p> }),
) {}
class MemoizedAsyncComponent extends Memoized.memo(AsyncComponent) {}

class SubComponent extends Component.make(function* SubComponent() {
    const [state] = React.useState(yield* Hook.useOnce(() => Effect.provide(makeUuid4, GetRandomValues.CryptoRandom)))
    return <Text>{state}</Text>
}) {}

export const Route = createFileRoute("/dev/async-rendering")({
    component: RouteComponent
})
