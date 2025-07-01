import { Box, Flex } from "@radix-ui/themes"
import { Chunk, Effect, Ref } from "effect"
import { R } from "../reffuse"
import { TodosState } from "../services"
import { VNewTodo } from "./VNewTodo"
import { VTodo } from "./VTodo"


export function VTodos() {

    const todosRef = R.useMemo(() => Effect.map(TodosState.TodosState, state => state.todos), [])
    const [todos] = R.useSubscribeRefs(todosRef)


    return (
        <Flex direction="column" align="center" gap="3">
            <Box width="500px">
                <VNewTodo />
            </Box>

            {Chunk.map(todos, (todo, index) => (
                <Box key={todo.id} width="500px">
                    <R.SubRefFromGetSet
                        parent={todosRef}
                        getter={parentValue => Chunk.unsafeGet(parentValue, index)}
                        setter={(parentValue, value) => Chunk.replace(parentValue, index, value)}
                    >
                        {ref => <VTodo
                            todoRef={ref}
                            remove={Ref.update(todosRef, Chunk.remove(index))}
                        />}
                    </R.SubRefFromGetSet>
                </Box>
            ))}
        </Flex>
    )

}
