import { Box, Button, Flex, IconButton } from "@radix-ui/themes"
import { GetRandomValues, makeUuid4 } from "@typed/id"
import { Chunk, DateTime, Effect, Match, Option, Ref, Runtime, Schema, Stream, SubscriptionRef } from "effect"
import { Component, Form, Hooks, Memoized, Subscribable, SubscriptionSubRef } from "effect-fc"
import { FaArrowDown, FaArrowUp } from "react-icons/fa"
import { FaDeleteLeft } from "react-icons/fa6"
import * as Domain from "@/domain"
import { DateTimeUtcFromZonedInput } from "@/lib/schema"
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
    | { readonly _tag: "new" }
    | { readonly _tag: "edit", readonly id: string }
)

export class Todo extends Component.makeUntraced("Todo")(function*(props: TodoProps) {
    const runtime = yield* Effect.runtime()
    const state = yield* TodosState

    const { ref, indexRef, contentRef, completedAtRef } = yield* Hooks.useMemo(() => Match.value(props).pipe(
        Match.tag("new", () => Effect.Do.pipe(
            Effect.bind("ref", () => Effect.andThen(makeTodo, SubscriptionRef.make)),
            Effect.let("indexRef", () => Subscribable.make({ get: Effect.succeed(-1), changes: Stream.empty })),
        )),
        Match.tag("edit", ({ id }) => Effect.Do.pipe(
            Effect.let("ref", () => state.getElementRef(id)),
            Effect.let("indexRef", () => state.getIndexSubscribable(id)),
        )),
        Match.exhaustive,

        Effect.let("contentRef", ({ ref }) => SubscriptionSubRef.makeFromPath(ref, ["content"])),
        Effect.let("completedAtRef", ({ ref }) => SubscriptionSubRef.makeFromPath(ref, ["completedAt"])),
    ), [props._tag, props._tag === "edit" ? props.id : undefined])

    const { form } = yield* Component.useOnChange(() => Effect.gen(function*() {
        const form = yield* Form.service({
            schema: Domain.Todo.TodoFromJson,
            initialEncodedValue: yield* Schema.encode(Domain.Todo.TodoFromJson)(
                yield* Match.value(props).pipe(
                    Match.tag("new", () => makeTodo),
                    Match.tag("edit", ({ id }) => state.getElementRef(id)),
                    Match.exhaustive,
                )
            ),
            onSubmit: v => Effect.void,
        })

        return { form }
    }), [props._tag, props._tag === "edit" ? props.id : undefined])

    const [index, size] = yield* Hooks.useSubscribables(indexRef, state.sizeSubscribable)


    return (
        <Flex direction="row" align="center" gap="2">
            <Box flexGrow="1">
                <Flex direction="column" align="stretch" gap="2">
                    <StringTextAreaInputFC ref={contentRef} />

                    <Flex direction="row" justify="center" align="center" gap="2">
                        <OptionalDateTimeInputFC
                            type="datetime-local"
                            ref={completedAtRef}
                            defaultValue={yield* Hooks.useOnce(() => DateTime.now)}
                        />

                        {props._tag === "new" &&
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
                        }
                    </Flex>
                </Flex>
            </Box>

            {props._tag === "edit" &&
                <Flex direction="column" justify="center" align="center" gap="1">
                    <IconButton
                        disabled={index <= 0}
                        onClick={() => Runtime.runSync(runtime)(state.moveLeft(props.id))}
                    >
                        <FaArrowUp />
                    </IconButton>

                    <IconButton
                        disabled={index >= size - 1}
                        onClick={() => Runtime.runSync(runtime)(state.moveRight(props.id))}
                    >
                        <FaArrowDown />
                    </IconButton>

                    <IconButton onClick={() => Runtime.runSync(runtime)(state.remove(props.id))}>
                        <FaDeleteLeft />
                    </IconButton>
                </Flex>
            }
        </Flex>
    )
}).pipe(
    Memoized.memoized
) {}
