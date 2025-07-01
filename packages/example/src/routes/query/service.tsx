import { QueryContext } from "@/query/reffuse"
import { Uuid4Query } from "@/query/services"
import { Uuid4QueryService } from "@/query/views/Uuid4QueryService"
import { R } from "@/reffuse"
import { HttpClient } from "@effect/platform"
import { createFileRoute } from "@tanstack/react-router"
import { Console, Effect, Layer, Schema } from "effect"
import { useMemo } from "react"


export const Route = createFileRoute("/query/service")({
    component: RouteComponent
})

function RouteComponent() {
    const query = R.useQuery({
        key: R.useStreamFromReactiveValues(["uuid4", 10 as number]),
        query: ([, count]) => Console.log(`Querying ${ count } IDs...`).pipe(
            Effect.andThen(Effect.sleep("500 millis")),
            Effect.andThen(Effect.map(
                HttpClient.HttpClient,
                HttpClient.withTracerPropagation(false),
            )),
            Effect.flatMap(client => client.get(`https://www.uuidtools.com/api/generate/v4/count/${ count }`)),
            Effect.flatMap(res => res.json),
            Effect.flatMap(Schema.decodeUnknown(Uuid4Query.Result)),
            Effect.scoped,
        ),
    })

    const layer = useMemo(() => Layer.succeed(Uuid4Query.Uuid4Query, query), [query])

    return (
        <QueryContext.Provider layer={layer}>
            <Uuid4QueryService />
        </QueryContext.Provider>
    )
}
