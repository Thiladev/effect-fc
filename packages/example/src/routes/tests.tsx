import { R } from "@/reffuse"
import { Button, Flex, Text } from "@radix-ui/themes"
import { createFileRoute } from "@tanstack/react-router"
import { GetRandomValues, makeUuid4 } from "@typed/id"
import { Console, Effect, Option } from "effect"
import { useEffect, useState } from "react"


interface Node {
    value: string
    left?: Leaf
    right?: Leaf
}
interface Leaf {
    node: Node
}


const makeUuid = Effect.provide(makeUuid4, GetRandomValues.CryptoRandom)


export const Route = createFileRoute("/tests")({
    component: RouteComponent
})

function RouteComponent() {
    const runSync = R.useRunSync()

    const [uuid, setUuid] = useState(R.useMemo(() => makeUuid, []))
    const generateUuid = R.useCallbackSync(() => makeUuid.pipe(
        Effect.tap(v => Effect.sync(() => setUuid(v)))
    ), [])

    const uuidStream = R.useStreamFromReactiveValues([uuid])
    const uuidStreamLatestValue = R.useSubscribeStream(uuidStream)

    const [, scopeLayer] = R.useScope([uuid])

    useEffect(() => Effect.addFinalizer(() => Console.log("Scope cleanup!")).pipe(
        Effect.andThen(Console.log("Scope changed")),
        Effect.provide(scopeLayer),
        runSync,
    ), [scopeLayer, runSync])


    const nodeRef = R.useRef(() => Effect.succeed<Node>({ value: "prout" }))
    const nodeValueRef = R.useSubRefFromPath(nodeRef, ["value"])


    return (
        <Flex direction="column" justify="center" align="center" gap="2">
            <Text>{uuid}</Text>
            <Button onClick={generateUuid}>Generate UUID</Button>
            <Text>
                {Option.match(uuidStreamLatestValue, {
                    onSome: ([v]) => v,
                    onNone: () => <></>,
                })}
            </Text>
        </Flex>
    )
}
