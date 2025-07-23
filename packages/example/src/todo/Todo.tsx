import * as Domain from "@/domain"
import { Box, Button, Flex, IconButton, TextArea } from "@radix-ui/themes"
import { GetRandomValues, makeUuid4 } from "@typed/id"
import { Chunk, Effect, Match, Option, Ref, Runtime, SubscriptionRef } from "effect"
import { Component, Hook, Memoized } from "effect-fc"
import { SubscriptionSubRef } from "effect-fc/types"
import { FaArrowDown, FaArrowUp } from "react-icons/fa"
import { FaDeleteLeft } from "react-icons/fa6"
import { TodosState } from "./TodosState.service"


const makeTodo = makeUuid4.pipe(
    Effect.map(id => Domain.Todo.Todo.make({
        id,
        content: "",
        completedAt: Option.none(),
    })),
    Effect.provide(GetRandomValues.CryptoRandom),
)


export type TodoProps = (
    | { readonly _tag: "new", readonly index?: never }
    | { readonly _tag: "edit", readonly index: number }
)

export class Todo extends Component.make(function* Todo(props: TodoProps) {
    const runtime = yield* Effect.runtime()
    const state = yield* TodosState

    const [ref, contentRef] = yield* Hook.useMemo(() => Match.value(props).pipe(
        Match.tag("new", () => Effect.andThen(makeTodo, SubscriptionRef.make)),
        Match.tag("edit", ({ index }) => Effect.succeed(SubscriptionSubRef.makeFromChunkRef(state.ref, index))),
        Match.exhaustive,

        Effect.map(ref => [
            ref,
            SubscriptionSubRef.makeFromPath(ref, ["content"]),
        ] as const),
    ), [props._tag, props.index])

    const [content, size] = yield* Hook.useSubscribeRefs(contentRef, state.sizeRef)

    return (
        <Flex direction="column" align="stretch" gap="2">
            <Flex direction="row" align="center" gap="2">
                <Box flexGrow="1">
                    <TextArea
                        value={content}
                        onChange={e => Runtime.runSync(runtime)(Ref.set(contentRef, e.target.value))}
                    />
                </Box>

                {props._tag === "edit" &&
                    <Flex direction="column" justify="center" align="center" gap="1">
                        <IconButton
                            disabled={props.index <= 0}
                            onClick={() => Runtime.runSync(runtime)(
                                SubscriptionRef.updateEffect(state.ref, todos => Effect.gen(function*() {
                                    if (props.index <= 0) return yield* Option.none()
                                    return todos.pipe(
                                        Chunk.replace(props.index, yield* Chunk.get(todos, props.index - 1)),
                                        Chunk.replace(props.index - 1, yield* ref),
                                    )
                                }))
                            )}
                        >
                            <FaArrowUp />
                        </IconButton>

                        <IconButton
                            disabled={props.index >= size - 1}
                            onClick={() => Runtime.runSync(runtime)(
                                SubscriptionRef.updateEffect(state.ref, todos => Effect.gen(function*() {
                                    if (props.index >= size - 1) return yield* Option.none()
                                    return todos.pipe(
                                        Chunk.replace(props.index, yield* Chunk.get(todos, props.index + 1)),
                                        Chunk.replace(props.index + 1, yield* ref),
                                    )
                                }))
                            )}
                        >
                            <FaArrowDown />
                        </IconButton>

                        <IconButton
                            onClick={() => Runtime.runSync(runtime)(
                                Ref.update(state.ref, Chunk.remove(props.index))
                            )}
                        >
                            <FaDeleteLeft />
                        </IconButton>
                    </Flex>
                }
            </Flex>

            {props._tag === "new" &&
                <Flex direction="row" justify="center">
                    <Button
                        onClick={() => ref.pipe(
                            Effect.andThen(todo => Ref.update(state.ref, Chunk.prepend(todo))),
                            Effect.andThen(makeTodo),
                            Effect.andThen(todo => Ref.set(ref, todo)),
                            Runtime.runSync(runtime),
                        )}
                    >
                        Add
                    </Button>
                </Flex>
            }
        </Flex>
    )
}).pipe(
    Memoized.memo
) {}
