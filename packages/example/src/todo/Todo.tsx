import { Box, Button, Flex, IconButton } from "@radix-ui/themes"
import { GetRandomValues, makeUuid4 } from "@typed/id"
import { Chunk, Effect, Match, Option, Ref, Runtime, Schema, Stream } from "effect"
import { Component, Form, Subscribable } from "effect-fc"
import { FaArrowDown, FaArrowUp } from "react-icons/fa"
import { FaDeleteLeft } from "react-icons/fa6"
import * as Domain from "@/domain"
import { TextFieldFormInput } from "@/lib/form/TextFieldFormInput"
import { DateTimeUtcFromZonedInput } from "@/lib/schema"
import { TodosState } from "./TodosState.service"


const TodoFormSchema = Schema.compose(Schema.Struct({
    ...Domain.Todo.Todo.fields,
    completedAt: Schema.OptionFromSelf(DateTimeUtcFromZonedInput),
}), Domain.Todo.Todo)

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

    const [indexRef, form, contentField, completedAtField] = yield* Component.useOnChange(() => Effect.gen(function*() {
        const indexRef = Match.value(props).pipe(
            Match.tag("new", () => Subscribable.make({ get: Effect.succeed(-1), changes: Stream.empty })),
            Match.tag("edit", ({ id }) => state.getIndexSubscribable(id)),
            Match.exhaustive,
        )

        const form = yield* Form.service({
            schema: TodoFormSchema,
            initialEncodedValue: yield* Schema.encode(TodoFormSchema)(
                yield* Match.value(props).pipe(
                    Match.tag("new", () => makeTodo),
                    Match.tag("edit", ({ id }) => state.getElementRef(id)),
                    Match.exhaustive,
                )
            ),
            onSubmit: function(todo) {
                return Match.value(props).pipe(
                    Match.tag("new", () => Ref.update(state.ref, Chunk.prepend(todo)).pipe(
                        Effect.andThen(makeTodo),
                        Effect.andThen(Schema.encode(TodoFormSchema)),
                        Effect.andThen(v => Ref.set(this.encodedValueRef, v)),
                    )),
                    Match.tag("edit", ({ id }) => Ref.set(state.getElementRef(id), todo)),
                    Match.exhaustive,
                )
            },
            autosubmit: props._tag === "edit",
        })

        return [
            indexRef,
            form,
            Form.field(form, ["content"]),
            Form.field(form, ["completedAt"]),
        ] as const
    }), [props._tag, props._tag === "edit" ? props.id : undefined])

    const [index, size] = yield* Subscribable.useSubscribables(indexRef, state.sizeSubscribable)
    const submit = yield* Form.useSubmit(form)
    const TextFieldFormInputFC = yield* TextFieldFormInput


    return (
        <Flex direction="row" align="center" gap="2">
            <Box flexGrow="1">
                <Flex direction="column" align="stretch" gap="2">
                    <TextFieldFormInputFC field={contentField} />

                    <Flex direction="row" justify="center" align="center" gap="2">
                        <TextFieldFormInputFC
                            optional
                            field={completedAtField}
                            type="datetime-local"
                            defaultValue=""
                        />

                        {props._tag === "new" &&
                            <Button onClick={() => submit()}>
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
}) {}
