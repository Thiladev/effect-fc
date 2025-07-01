import { R } from "@/reffuse"
import { Button, Text } from "@radix-ui/themes"
import { createFileRoute } from "@tanstack/react-router"
import * as LazyRef from "@typed/lazy-ref"
import { Suspense, use } from "react"


export const Route = createFileRoute("/lazyref")({
    component: RouteComponent
})

function RouteComponent() {
    const promise = R.usePromise(() => LazyRef.of(0), [])

    return (
        <Suspense fallback={<Text>Loading...</Text>}>
            <LazyRefComponent promise={promise} />
        </Suspense>
    )
}

function LazyRefComponent({ promise }: { readonly promise: Promise<LazyRef.LazyRef<number>> }) {
    const ref = use(promise)
    const [value, setValue] = R.useLazyRefState(ref)

    return (
        <Button onClick={() => setValue(prev => prev + 1)}>
            {value}
        </Button>
    )
}
