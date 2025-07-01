import { Todo } from "@/domain"
import { Box, Card, Flex, IconButton, TextArea } from "@radix-ui/themes"
import { Effect, Ref, Stream, SubscriptionRef } from "effect"
import { Delete } from "lucide-react"
import { useState } from "react"
import { R } from "../reffuse"


export interface VTodoProps {
    readonly todoRef: SubscriptionRef.SubscriptionRef<Todo.Todo>
    readonly remove: Effect.Effect<void>
}

export function VTodo({ todoRef, remove }: VTodoProps) {

    const runSync = R.useRunSync()

    const localTodoRef = R.useRef(() => todoRef)
    const [content, setContent] = R.useRefState(R.useSubRefFromPath(localTodoRef, ["content"]))

    R.useFork(() => localTodoRef.changes.pipe(
        Stream.debounce("250 millis"),
        Stream.runForEach(v => Ref.set(todoRef, v)),
    ), [localTodoRef])

    const editorMode = useState(false)


    return (
        <Box>
            <Card>
                <Flex direction="column" align="stretch" gap="1">
                    <TextArea
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        disabled={!editorMode}
                    />

                    <Flex direction="row" justify="between" align="center">
                        <Box></Box>

                        <Flex direction="row" align="center" gap="1">
                            <IconButton onClick={() => runSync(remove)}>
                                <Delete />
                            </IconButton>
                        </Flex>
                    </Flex>
                </Flex>
            </Card>
        </Box>
    )

}
