import { TodosContext } from "@/todos/reffuse"
import { TodosState } from "@/todos/services"
import { VTodos } from "@/todos/views/VTodos"
import { Container } from "@radix-ui/themes"
import { createFileRoute } from "@tanstack/react-router"
import { Console, Effect, Layer } from "effect"
import { useMemo } from "react"


export const Route = createFileRoute("/todos")({
    component: Todos
})

function Todos() {

    const todosLayer = useMemo(() => Layer.empty.pipe(
        Layer.provideMerge(TodosState.make("todos")),

        Layer.merge(Layer.effectDiscard(
            Effect.addFinalizer(() => Console.log("TodosContext cleaned up")).pipe(
                Effect.andThen(Console.log("TodosContext constructed"))
            )
        )),
    ), [])


    return (
        <Container>
            <TodosContext.Provider layer={todosLayer} finalizerExecutionMode="fork">
                <VTodos />
            </TodosContext.Provider>
        </Container>
    )

}
