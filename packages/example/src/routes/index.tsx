import { runtime } from "@/runtime"
import { Todos } from "@/todo/Todos"
import { TodosState } from "@/todo/TodosState.service"
import { createFileRoute } from "@tanstack/react-router"
import { Effect } from "effect"
import { Component, Hook } from "effect-fc"


const TodosStateLive = TodosState.Default("todos")

export const Route = createFileRoute("/")({
    component: Component.make(function* Index() {
        const context = yield* Hook.useContext(TodosStateLive, { finalizerExecutionMode: "fork" })
        return yield* Effect.provide(Component.use(Todos, Todos => <Todos />), context)
    }).pipe(
        Component.withRuntime(runtime.context)
    )

    // component: Component.make("Index")(
    //     () => Hook.useContext(TodosStateLive, { finalizerExecutionMode: "fork" }),
    //     Effect.andThen(context => Effect.provide(Component.use(Todos, Todos => <Todos />), context)),
    // ).pipe(
    //     Component.withRuntime(runtime.context)
    // )
})
