import { runtime } from "@/runtime"
import { Flex, Text, TextField } from "@radix-ui/themes"
import { createFileRoute } from "@tanstack/react-router"
import { GetRandomValues, makeUuid4 } from "@typed/id"
import { Effect } from "effect"
import { Component, Memo } from "effect-fc"
import * as React from "react"


const RouteComponent = Component.makeUntraced(function* RouteComponent() {
    const [value, setValue] = React.useState("")

    return (
        <Flex direction="column" gap="2">
            <TextField.Root
                value={value}
                onChange={e => setValue(e.target.value)}
            />

            {yield* Effect.map(SubComponent, FC => <FC />)}
            {yield* Effect.map(MemoizedSubComponent, FC => <FC />)}
        </Flex>
    )
}).pipe(
    Component.withRuntime(runtime.context)
)

class SubComponent extends Component.makeUntraced(function* SubComponent() {
    const id = yield* makeUuid4.pipe(Effect.provide(GetRandomValues.CryptoRandom))
    return <Text>{id}</Text>
}) {}

class MemoizedSubComponent extends Memo.memo(SubComponent) {}

export const Route = createFileRoute("/dev/memo")({
    component: RouteComponent,
})
