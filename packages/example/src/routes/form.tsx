import { Button, Container, Flex } from "@radix-ui/themes"
import { createFileRoute } from "@tanstack/react-router"
import { Console, Effect, Option, ParseResult, Schema } from "effect"
import { Component, Form, Subscribable } from "effect-fc"
import { TextFieldFormInput } from "@/lib/form/TextFieldFormInput"
import { DateTimeUtcFromZonedInput } from "@/lib/schema"
import { runtime } from "@/runtime"


const email = Schema.pattern<typeof Schema.String>(
    /^(?!\.)(?!.*\.\.)([A-Z0-9_+-.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9-]*\.)+[A-Z]{2,}$/i,

    {
        identifier: "email",
        title: "email",
        message: () => "Not an email address",
    },
)

const RegisterFormSchema = Schema.Struct({
    email: Schema.String.pipe(email),
    password: Schema.String.pipe(Schema.minLength(3)),
    birth: Schema.OptionFromSelf(DateTimeUtcFromZonedInput),
})

class RegisterForm extends Effect.Service<RegisterForm>()("RegisterForm", {
    scoped: Form.service({
        schema: RegisterFormSchema.pipe(
            Schema.compose(
                Schema.transformOrFail(
                    Schema.typeSchema(RegisterFormSchema),
                    Schema.typeSchema(RegisterFormSchema),
                    {
                        decode: v => Effect.andThen(Effect.sleep("500 millis"), ParseResult.succeed(v)),
                        encode: ParseResult.succeed,
                    },
                ),
            ),
        ),

        initialEncodedValue: { email: "", password: "", birth: Option.none() },
        onSubmit: v => Effect.sleep("500 millis").pipe(
            Effect.andThen(Console.log(v)),
            Effect.andThen(Effect.sync(() => alert("Done!"))),
        ),
        debounce: "500 millis",
    })
}) {}

class RegisterFormView extends Component.makeUntraced("RegisterFormView")(function*() {
    const form = yield* RegisterForm
    const submit = yield* Form.useSubmit(form)
    const [canSubmit] = yield* Subscribable.useSubscribables(form.canSubmitSubscribable)

    const TextFieldFormInputFC = yield* TextFieldFormInput


    return (
        <Container width="300">
            <form onSubmit={e => {
                e.preventDefault()
                void submit()
            }}>
                <Flex direction="column" gap="2">
                    <TextFieldFormInputFC
                        field={Form.useField(form, ["email"])}
                    />

                    <TextFieldFormInputFC
                        field={Form.useField(form, ["password"])}
                    />

                    <TextFieldFormInputFC
                        optional
                        type="datetime-local"
                        field={Form.useField(form, ["birth"])}
                        defaultValue=""
                    />

                    <Button disabled={!canSubmit}>Submit</Button>
                </Flex>
            </form>
        </Container>
    )
}) {}

const RegisterPage = Component.makeUntraced("RegisterPage")(function*() {
    const RegisterFormViewFC = yield* Effect.provide(
        RegisterFormView,
        yield* Component.useContext(RegisterForm.Default, { finalizerExecutionMode: "fork" }),
    )

    return <RegisterFormViewFC />
}).pipe(
    Component.withRuntime(runtime.context)
)


export const Route = createFileRoute("/form")({
    component: RegisterPage
})
