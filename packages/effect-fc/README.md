# Effect FC

[Effect-TS](https://effect.website/) integration for React 19+ that allows you to write function components using Effect generators.

This library is in early development. While it is (almost) feature complete and mostly usable, expect bugs and quirks. Things are still being ironed out, so ideas and criticisms are more than welcome.

Documentation is currently being written. In the meantime, you can take a look at the `packages/example` directory.

## Peer dependencies
- `effect` 3.15+
- `react` & `@types/react` 19+

## Known issues
- React Refresh replacement doesn't work for Effect FC's yet. Page reload is required to view changes. Regular React components are unaffected.

## What writing components looks like
```typescript
import { Component, Hook, Memoized } from "effect-fc"
import { Todo } from "./Todo"
import { TodosState } from "./TodosState.service"
import { runtime } from "@/runtime"

class Todos extends Component.make(function* Todos() {
    const state = yield* TodosState
    const [todos] = yield* Hook.useSubscribeRefs(state.ref)

    yield* Hook.useOnce(() => Effect.andThen(
        Console.log("Todos mounted"),
        Effect.addFinalizer(() => Console.log("Todos unmounted")),
    ))

    const TodoFC = yield* Component.useFC(Todo)

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
}).pipe(
    Memoized.memo
) {}

const TodosEntrypoint = Component.make(function* TodosEntrypoint() {
    const context = yield* Hook.useContext(TodosState.Default, { finalizerExecutionMode: "fork" })
    const TodosFC = yield* Effect.provide(Component.useFC(Todos), context)

    return <TodosFC />
}).pipe(
    Component.withRuntime(runtime.context)
)
```
