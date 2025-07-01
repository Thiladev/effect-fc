import { R } from "@/reffuse"
import { HttpClient } from "@effect/platform"
import { Text } from "@radix-ui/themes"
import { createFileRoute } from "@tanstack/react-router"
import { Console, Effect, Schema } from "effect"
import { Suspense, use } from "react"


export const Route = createFileRoute("/promise")({
    component: RouteComponent
})


const Result = Schema.Tuple(Schema.String)
type Result = typeof Result.Type

function RouteComponent() {
    const promise = R.usePromise(() => Effect.addFinalizer(() => Console.log("Cleanup")).pipe(
        Effect.andThen(HttpClient.get("https://www.uuidtools.com/api/generate/v4")),
        HttpClient.withTracerPropagation(false),
        Effect.flatMap(res => res.json),
        Effect.flatMap(Schema.decodeUnknown(Result)),
    ), [])

    return (
        <Suspense fallback={<Text>Loading...</Text>}>
            <AsyncComponent promise={promise} />
        </Suspense>
    )
}

function AsyncComponent({ promise }: { readonly promise: Promise<Result> }) {
    const [uuid] = use(promise)
    return <Text>{uuid}</Text>
}
