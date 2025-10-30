import { HttpClient } from "@effect/platform"
import { Container, Heading, Text } from "@radix-ui/themes"
import { createFileRoute } from "@tanstack/react-router"
import { Effect, Match, Schema } from "effect"
import { Component } from "effect-fc"
import { runtime } from "@/runtime"


const Post = Schema.Struct({
    userId: Schema.Int,
    id: Schema.Int,
    title: Schema.String,
    body: Schema.String,
})

const Result = Component.makeUntraced("Result")(function*() {
    const result = yield* Component.useOnMountResult(() => HttpClient.HttpClient.pipe(
        Effect.andThen(client => client.get("https://jsonplaceholder.typicode.com/posts/1")),
        Effect.andThen(Schema.decodeUnknown(Post)),
        Effect.tap(Effect.sleep("250 millis")),
    ))

    return (
        <Container>
            {Match.value(result).pipe(
                Match.tag("Running", () => <Text>Loading...</Text>),
                Match.tag("Success", result => <>
                    <Heading>{result.value.title}</Heading>
                    <Text>{result.value.body}</Text>
                </>),
                Match.tag("Failure", result =>
                    <Text>An error has occured: {result.cause.toString()}</Text>
                ),
                Match.orElse(() => <></>),
            )}
        </Container>
    )
}).pipe(
    Component.withRuntime(runtime.context)
)

export const Route = createFileRoute("/result")({
    component: Result
})
