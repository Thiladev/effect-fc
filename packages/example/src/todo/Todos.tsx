import { Container, Flex, Heading } from "@radix-ui/themes"
import { Chunk, Console, Effect } from "effect"
import { Component, Hook } from "effect-fc"
import { Todo } from "./Todo"
import { TodosState } from "./TodosState.service"


export class Todos extends Component.make(function* Todos() {
    const state = yield* TodosState
    const [todos] = yield* Hook.useSubscribeRefs(state.ref)

    yield* Hook.useOnce(() => Effect.andThen(
        Console.log("Todos mounted"),
        Effect.addFinalizer(() => Console.log("Todos unmounted")),
    ))

    const TodoFC = yield* Todo

    return (
        <Container>
            <Heading align="center">Todos</Heading>

            <Flex direction="column" align="stretch" gap="2" mt="2">
                <TodoFC _tag="new" />

                {Chunk.map(todos, (v, k) =>
                    <TodoFC key={v.id} _tag="edit" index={k} />
                )}
            </Flex>
        </Container>
    )
}) {}
