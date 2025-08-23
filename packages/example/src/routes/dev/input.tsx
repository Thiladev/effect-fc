import { TextFieldInput } from "@/lib/input/TextFieldInput"
import { runtime } from "@/runtime"
import { Container } from "@radix-ui/themes"
import { createFileRoute } from "@tanstack/react-router"
import { Schema, SubscriptionRef } from "effect"
import { Component, Memo } from "effect-fc"
import { useInput, useOnce, useRefState } from "effect-fc/hooks"


const IntFromString = Schema.NumberFromString.pipe(Schema.int())

const IntTextFieldInput = TextFieldInput({ schema: IntFromString })
const StringTextFieldInput = TextFieldInput({ schema: Schema.String })

const Input = Component.makeUntraced(function* Input() {
    const IntTextFieldInputFC = yield* IntTextFieldInput
    const StringTextFieldInputFC = yield* StringTextFieldInput

    const intRef1 = yield* useOnce(() => SubscriptionRef.make(0))
    const intRef2 = yield* useOnce(() => SubscriptionRef.make(0))
    const stringRef = yield* useOnce(() => SubscriptionRef.make(""))
    // yield* useFork(() => Stream.runForEach(intRef1.changes, Console.log), [intRef1])

    const input2 = yield* useInput({ schema: IntFromString, ref: intRef2 })

    const [str, setStr] = yield* useRefState(stringRef)

    return (
        <Container>
            <IntTextFieldInputFC ref={intRef1} />
            <StringTextFieldInputFC ref={stringRef} />
            <StringTextFieldInputFC ref={stringRef} />
        </Container>
    )
}).pipe(
    Memo.memo,
    Component.withRuntime(runtime.context)
)

export const Route = createFileRoute("/dev/input")({
    component: Input,
})
