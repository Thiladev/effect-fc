import { R } from "@/reffuse"
import { HttpClient } from "@effect/platform"
import { Button, Container, Flex, Slider, Text } from "@radix-ui/themes"
import { createFileRoute } from "@tanstack/react-router"
import * as AsyncData from "@typed/async-data"
import { Array, Console, Effect, flow, Option, Schema, Stream } from "effect"
import { useState } from "react"


export const Route = createFileRoute("/query/usequery")({
    component: RouteComponent
})


const Result = Schema.Array(Schema.String)

function RouteComponent() {
    const runFork = R.useRunFork()

    const [count, setCount] = useState(1)

    const query = R.useQuery({
        key: R.useStreamFromReactiveValues(["uuid4", count]),
        query: ([, count]) => Console.log(`Querying ${ count } IDs...`).pipe(
            Effect.andThen(Effect.sleep("500 millis")),
            Effect.andThen(Effect.map(
                HttpClient.HttpClient,
                HttpClient.withTracerPropagation(false),
            )),
            Effect.flatMap(client => client.get(`https://www.uuidtools.com/api/generate/v4/count/${ count }`)),
            Effect.flatMap(res => res.json),
            Effect.flatMap(Schema.decodeUnknown(Result)),
            Effect.scoped,
        ),
    })

    const [state] = R.useSubscribeRefs(query.stateRef)


    return (
        <Container>
            <Flex direction="column" align="center" gap="2">
                <Slider
                    min={1}
                    max={100}
                    value={[count]}
                    onValueChange={flow(
                        Array.head,
                        Option.getOrThrow,
                        setCount,
                    )}
                />

                <Text>
                    {AsyncData.match(state, {
                        NoData: () => "No data yet",
                        Loading: () => "Loading...",
                        Success: (value, { isRefreshing, isOptimistic }) =>
                            `Value: ${value} ${isRefreshing ? "(refreshing)" : ""} ${isOptimistic ? "(optimistic)" : ""}`,
                        Failure: (cause, { isRefreshing }) =>
                            `Error: ${cause} ${isRefreshing ? "(refreshing)" : ""}`,
                    })}
                </Text>

                <Button
                    onClick={() => query.forkRefresh.pipe(
                        Effect.flatMap(([, state]) => Stream.runForEach(state, Console.log)),
                        Effect.andThen(Console.log("Refresh finished or stopped")),
                        runFork,
                    )}
                >
                    Refresh
                </Button>
            </Flex>
        </Container>
    )
}
