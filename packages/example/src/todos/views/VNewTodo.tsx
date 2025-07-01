import { Todo } from "@/domain"
import { Box, Button, Card, Flex, TextArea } from "@radix-ui/themes"
import { GetRandomValues, makeUuid4 } from "@typed/id"
import { Chunk, Effect, Option, Ref } from "effect"
import { R } from "../reffuse"
import { TodosState } from "../services"


const createEmptyTodo = makeUuid4.pipe(
    Effect.map(id => Todo.Todo.make({ id, content: "", completedAt: Option.none()}, true)),
    Effect.provide(GetRandomValues.CryptoRandom),
)


export function VNewTodo() {

    const todoRef = R.useRef(() => createEmptyTodo)
    const [content, setContent] = R.useRefState(R.useSubRefFromPath(todoRef, ["content"]))

    const add = R.useCallbackSync(() => Effect.all([TodosState.TodosState, todoRef]).pipe(
        Effect.flatMap(([state, todo]) => Ref.update(state.todos, Chunk.prepend(todo))),
        Effect.andThen(createEmptyTodo),
        Effect.flatMap(v => Ref.set(todoRef, v)),
    ), [todoRef])


    return (
        <Box>
            <Card>
                <Flex direction="column" align="stretch" gap="2">
                    <TextArea
                        value={content}
                        onChange={e => setContent(e.target.value)}
                    />

                    <Flex direction="row" justify="center" align="center">
                        <Button onClick={add}>Add</Button>
                    </Flex>
                </Flex>
            </Card>
        </Box>
    )

}
