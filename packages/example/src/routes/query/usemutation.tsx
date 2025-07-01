import { R } from "@/reffuse"
import { HttpClient } from "@effect/platform"
import { Button, Container, Flex, Slider, Text } from "@radix-ui/themes"
import { QueryProgress } from "@reffuse/extension-query"
import { createFileRoute } from "@tanstack/react-router"
import * as AsyncData from "@typed/async-data"
import { Array, Console, Effect, flow, Option, Schema, Stream } from "effect"
import { useState } from "react"


export const Route = createFileRoute("/query/usemutation")({
    component: RouteComponent
})


const Result = Schema.Array(Schema.String)

function RouteComponent() {
    const runFork = R.useRunFork()

    const [count, setCount] = useState(1)

    const mutation = R.useMutation({
        mutation: ([count]: readonly [count: number]) => Console.log(`Querying ${ count } IDs...`).pipe(
            Effect.andThen(QueryProgress.QueryProgress.update(() =>
                AsyncData.Progress.make({ loaded: 0, total: Option.some(100) })
            )),
            Effect.andThen(Effect.sleep("500 millis")),
            Effect.tap(() => QueryProgress.QueryProgress.update(() =>
                AsyncData.Progress.make({ loaded: 50, total: Option.some(100) })
            )),
            Effect.andThen(Effect.map(
                HttpClient.HttpClient,
                HttpClient.withTracerPropagation(false),
            )),
            Effect.flatMap(client => client.get(`https://www.uuidtools.com/api/generate/v4/count/${ count }`)),
            Effect.flatMap(res => res.json),
            Effect.flatMap(Schema.decodeUnknown(Result)),
            Effect.scoped,
        )
    })

    const [state] = R.useSubscribeRefs(mutation.stateRef)


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
                        Loading: progress =>
                            `Loading...
                            ${ Option.match(progress, {
                                onSome: ({ loaded, total }) => ` (${ loaded }/${ Option.getOrElse(total, () => "unknown") })`,
                                onNone: () => "",
                            }) }`,
                        Success: value => `Value: ${ value }`,
                        Failure: cause => `Error: ${ cause }`,
                    })}
                </Text>

                <Button onClick={() => mutation.forkMutate(count).pipe(
                    Effect.flatMap(([, state]) => Stream.runForEach(state, Console.log)),
                    Effect.andThen(Console.log("Mutation done.")),
                    runFork,
                )}>
                    Get
                </Button>
            </Flex>
        </Container>
    )
}
