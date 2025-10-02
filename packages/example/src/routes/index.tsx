import { createFileRoute } from "@tanstack/react-router"
import { Effect } from "effect"
import { Component, Hooks } from "effect-fc"
import { runtime } from "@/runtime"
import { Todos } from "@/todo/Todos"
import { TodosState } from "@/todo/TodosState.service"


const TodosStateLive = TodosState.Default("todos")

const Index = Component.makeUntraced("Index")(function*() {
    const TodosFC = yield* Effect.provide(
        Todos,
        yield* Hooks.useContext(TodosStateLive, { finalizerExecutionMode: "fork" }),
    )

    return <TodosFC />
}).pipe(
    Component.withRuntime(runtime.context)
)

export const Route = createFileRoute("/")({
    component: Index
})
