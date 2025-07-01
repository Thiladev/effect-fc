import { AlertDialog, Button, Flex, Text } from "@radix-ui/themes"
import { Cause, Console, Effect, Either, flow, Match, Option, Stream } from "effect"
import { useState } from "react"
import { R } from "./reffuse"
import { AppQueryErrorHandler } from "./services"


export function VQueryErrorHandler() {
    const [open, setOpen] = useState(false)

    const error = R.useSubscribeStream(
        R.useMemo(() => AppQueryErrorHandler.AppQueryErrorHandler.pipe(
            Effect.map(handler => handler.errors.pipe(
                Stream.changes,
                Stream.tap(Console.error),
                Stream.tap(() => Effect.sync(() => setOpen(true))),
            ))
        ), [])
    )

    if (Option.isNone(error))
        return <></>

    return (
        <AlertDialog.Root open={open}>
            <AlertDialog.Content maxWidth="450px">
                <AlertDialog.Title>Error</AlertDialog.Title>
                <AlertDialog.Description size="2">
                    {Either.match(Cause.failureOrCause(error.value), {
                        onLeft: flow(
                            Match.value,
                            Match.tag("RequestError", () => <Text>HTTP request error</Text>),
                            Match.tag("ResponseError", () => <Text>HTTP response error</Text>),
                            Match.exhaustive,
                        ),

                        onRight: flow(
                            Cause.dieOption,
                            Option.match({
                                onSome: () => <Text>Unrecoverable defect</Text>,
                                onNone: () => <Text>Unknown error</Text>,
                            }),
                        ),
                    })}
                </AlertDialog.Description>

                <Flex gap="3" mt="4" justify="end">
                    <AlertDialog.Action>
                        <Button variant="solid" color="red" onClick={() => setOpen(false)}>
                            Ok
                        </Button>
                    </AlertDialog.Action>
                </Flex>
            </AlertDialog.Content>
        </AlertDialog.Root>
    )
}
