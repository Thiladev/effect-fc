import { RootReffuse } from "@/reffuse"
import { Reffuse, ReffuseContext } from "reffuse"
import { TodosState } from "./services"


export const TodosContext = ReffuseContext.make<TodosState.TodosState>()

export const R = new class TodosReffuse extends RootReffuse.pipe(
    Reffuse.withContexts(TodosContext)
) {}
