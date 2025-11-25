import { HttpClient, type HttpClientError } from "@effect/platform"
import { Button, Container, Flex, Heading, Slider, Text } from "@radix-ui/themes"
import { createFileRoute } from "@tanstack/react-router"
import { Array, Cause, Chunk, Console, Effect, flow, Match, Option, Schema, Stream } from "effect"
import { Component, ErrorObserver, Query, Result, Subscribable, SubscriptionRef } from "effect-fc"
import { runtime } from "@/runtime"


const Post = Schema.Struct({
    userId: Schema.Int,
    id: Schema.Int,
    title: Schema.String,
    body: Schema.String,
})

const ResultView = Component.makeUntraced("Result")(function*() {
    const runPromise = yield* Component.useRunPromise()

    const [idRef, query] = yield* Component.useOnMount(() => Effect.gen(function*() {
        const idRef = yield* SubscriptionRef.make(1)
        const key = Stream.zipLatest(Stream.make("posts" as const), idRef.changes)

        const query = yield* Query.service({
            key,
            f: ([, id]) => HttpClient.HttpClient.pipe(
                Effect.tap(Effect.sleep("500 millis")),
                Effect.andThen(client => client.get(`https://jsonplaceholder.typicode.com/posts/${ id }`)),
                Effect.andThen(response => response.json),
                Effect.andThen(Schema.decodeUnknown(Post)),
            ),
        })

        return [idRef, query] as const
    }))

    const [id, setId] = yield* SubscriptionRef.useSubscriptionRefState(idRef)
    const [result] = yield* Subscribable.useSubscribables([query.result])

    yield* Component.useOnMount(() => ErrorObserver.ErrorObserver<HttpClientError.HttpClientError>().pipe(
        Effect.andThen(observer => observer.subscribe),
        Effect.andThen(Stream.fromQueue),
        Stream.unwrapScoped,
        Stream.runForEach(flow(
            Cause.failures,
            Chunk.findFirst(e => e._tag === "RequestError" || e._tag === "ResponseError"),
            Option.match({
                onSome: e => Console.log("ResultView HttpClient error", e),
                onNone: () => Effect.void,
            }),
        )),
        Effect.forkScoped,
    ))

    return (
        <Container>
            <Flex direction="column" align="center" gap="2">
                <Slider
                    value={[id]}
                    onValueChange={flow(Array.head, Option.getOrThrow, setId)}
                />

                {Match.value(result).pipe(
                    Match.tag("Running", () => <Text>Loading...</Text>),
                    Match.tag("Success", result => <>
                        <Heading>{result.value.title}</Heading>
                        <Text>{result.value.body}</Text>
                        {Result.isRefreshing(result) && <Text>Refreshing...</Text>}
                    </>),
                    Match.tag("Failure", result =>
                        <Text>An error has occured: {result.cause.toString()}</Text>
                    ),
                    Match.orElse(() => <></>),
                )}

                <Flex direction="row" justify="center" align="center" gap="1">
                    <Button onClick={() => runPromise(query.refresh)}>Refresh</Button>
                    <Button onClick={() => runPromise(query.refetch)}>Refetch</Button>
                </Flex>
            </Flex>
        </Container>
    )
})

export const Route = createFileRoute("/query")({
    component: Component.withRuntime(ResultView, runtime.context)
})
