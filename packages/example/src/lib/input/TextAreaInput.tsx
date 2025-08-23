import { Callout, Flex, TextArea, TextAreaProps } from "@radix-ui/themes"
import { Array, Equivalence, Option, ParseResult, Schema, Struct } from "effect"
import { Component } from "effect-fc"
import { useInput } from "effect-fc/hooks"
import * as React from "react"


export type TextAreaInputProps<A, R> = Omit<useInput.Options<A, R>, "schema" | "equivalence"> & Omit<TextAreaProps, "ref">

export const TextAreaInput = <A, R>(options: {
    readonly schema: Schema.Schema<A, string, R>
    readonly equivalence?: Equivalence.Equivalence<A>
}): Component.Component<
    TextAreaInputProps<A, R>,
    React.JSX.Element,
    ParseResult.ParseError,
    R
> => Component.makeUntraced(function* TextFieldInput(props) {
    const input = yield* useInput({ ...options, ...props })
    const issue = React.useMemo(() => input.error.pipe(
        Option.map(ParseResult.ArrayFormatter.formatErrorSync),
        Option.flatMap(Array.head),
    ), [input.error])

    return (
        <Flex direction="column" gap="1">
            <TextArea
                value={input.value}
                onChange={e => input.setValue(e.target.value)}
                {...Struct.omit(props, "ref")}
            />

            {Option.isSome(issue) &&
                <Callout.Root color="red" role="alert">
                    <Callout.Text>{issue.value.message}</Callout.Text>
                </Callout.Root>
            }
        </Flex>
    )
})
