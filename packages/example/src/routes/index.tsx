import { runtime } from "@/runtime"
import { Todos } from "@/todo/Todos"
import { TodosState } from "@/todo/TodosState.service"
import { createFileRoute } from "@tanstack/react-router"
import { Effect } from "effect"
import { Component } from "effect-fc"
import { useContext } from "effect-fc/hooks"


const TodosStateLive = TodosState.Default("todos")

const Index = Component.makeUntraced(function* Index() {
    const context = yield* useContext(TodosStateLive, { finalizerExecutionMode: "fork" })
    const TodosFC = yield* Effect.provide(Todos, context)

    return <TodosFC />
}).pipe(
    Component.withRuntime(runtime.context)
)

export const Route = createFileRoute("/")({
    component: Index
})
