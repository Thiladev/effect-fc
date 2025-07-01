import { R } from "@/reffuse"
import { Button, Flex, Text } from "@radix-ui/themes"
import { createFileRoute } from "@tanstack/react-router"
import { Chunk, Effect, Exit, Option, Queue, Random, Scope, Stream } from "effect"
import { useMemo, useState } from "react"


export const Route = createFileRoute("/streams/pull")({
    component: RouteComponent
})

function RouteComponent() {
    const stream = useMemo(() => Stream.repeatEffect(Random.nextInt), [])
    const streamScope = R.useScope([stream], { finalizerExecutionMode: "fork" })

    const queue = R.useMemo(() => Effect.provideService(Stream.toQueueOfElements(stream), Scope.Scope, streamScope), [streamScope])

    const [value, setValue] = useState(Option.none<number>())
    const pullLatest = R.useCallbackSync(() => Queue.takeAll(queue).pipe(
        Effect.flatMap(Chunk.last),
        Effect.flatMap(Exit.matchEffect({
            onSuccess: Effect.succeed,
            onFailure: Effect.fail,
        })),
        Effect.tap(v => Effect.sync(() => setValue(Option.some(v)))),
    ), [queue])

    return (
        <Flex direction="column" align="center" gap="2">
            {Option.isSome(value) && <Text>{value.value}</Text>}
            <Button onClick={pullLatest}>Pull latest</Button>
        </Flex>
    )
}
