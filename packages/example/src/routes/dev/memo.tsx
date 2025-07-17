import { runtime } from "@/runtime"
import { Flex, Text, TextField } from "@radix-ui/themes"
import { createFileRoute } from "@tanstack/react-router"
import { GetRandomValues, makeUuid4 } from "@typed/id"
import { Effect } from "effect"
import { Component } from "effect-fc"
import * as React from "react"


const RouteComponent = Component.make(function* RouteComponent() {
    const VSubComponent = yield* Component.useFC(SubComponent)
    const VMemoizedSubComponent = yield* Component.useFC(MemoizedSubComponent)

    const [value, setValue] = React.useState("")

    return (
        <Flex direction="column" gap="2">
            <TextField.Root
                value={value}
                onChange={e => setValue(e.target.value)}
            />

            <VSubComponent />
            <VMemoizedSubComponent />
        </Flex>
    )
}).pipe(
    Component.withRuntime(runtime.context)
)

const SubComponent = Component.make(function* SubComponent() {
    const id = yield* makeUuid4.pipe(Effect.provide(GetRandomValues.CryptoRandom))
    return <Text>{id}</Text>
})

const MemoizedSubComponent = Component.memo(SubComponent)

export const Route = createFileRoute("/dev/memo")({
    component: RouteComponent,
})
