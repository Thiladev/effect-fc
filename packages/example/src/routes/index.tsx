import { runtime } from "@/runtime"
import { Todos } from "@/todo/Todos"
import { TodosState } from "@/todo/TodosState.service"
import { createFileRoute } from "@tanstack/react-router"
import { Effect } from "effect"
import { Component, Hook } from "effect-fc"


const TodosStateLive = TodosState.Default("todos")

export const Route = createFileRoute("/")({
    component: Component.make(function* Index() {
        return yield* Todos.pipe(
            Effect.map(FC => <FC />),
            Effect.provide(yield* Hook.useContext(TodosStateLive, { finalizerExecutionMode: "fork" })),
        )
    }).pipe(
        Component.withRuntime(runtime.context)
    )
})
