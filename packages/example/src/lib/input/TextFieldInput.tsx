import { Callout, Checkbox, Flex, TextField } from "@radix-ui/themes"
import { Array, Equivalence, Option, ParseResult, Schema, Struct } from "effect"
import { Component, Memo } from "effect-fc"
import { useInput, useOptionalInput } from "effect-fc/hooks"
import * as React from "react"


export type TextFieldInputProps<A, R> = (
    & Omit<useInput.Options<A, R>, "schema" | "equivalence">
    & Omit<TextField.RootProps, "ref">
)
export type TextFieldOptionalInputProps<A, R> = (
    & Omit<useOptionalInput.Options<A, R>, "schema" | "equivalence">
    & Omit<TextField.RootProps, "ref" | "defaultValue">
)

export const TextFieldInput = <A, R, O extends boolean = false>(options: {
    readonly optional?: O
    readonly schema: Schema.Schema<A, string, R>
    readonly equivalence?: Equivalence.Equivalence<A>
}) => Component.makeUntraced(function* TextFieldInput(props: O extends true
    ? TextFieldOptionalInputProps<A, R>
    : TextFieldInputProps<A, R>
) {
    const input: (
        | { readonly optional: true } & useOptionalInput.Result
        | { readonly optional: false } & useInput.Result
    ) = options.optional
        ? {
            optional: true,
            // eslint-disable-next-line react-hooks/rules-of-hooks
            ...yield* useOptionalInput({ ...options, ...props as TextFieldOptionalInputProps<A, R> }),
        }
        : {
            optional: false,
            // eslint-disable-next-line react-hooks/rules-of-hooks
            ...yield* useInput({ ...options, ...props as TextFieldInputProps<A, R> }),
        }

    const issue = React.useMemo(() => input.error.pipe(
        Option.map(ParseResult.ArrayFormatter.formatErrorSync),
        Option.flatMap(Array.head),
    ), [input.error])

    return (
        <Flex direction="column" gap="1">
            <Flex direction="row" align="center" gap="1">
                {input.optional &&
                    <Checkbox
                        checked={input.enabled}
                        onCheckedChange={checked => input.setEnabled(checked !== "indeterminate" && checked)}
                    />
                }

                <TextField.Root
                    value={input.value}
                    onChange={e => input.setValue(e.target.value)}
                    disabled={input.optional ? !input.enabled : undefined}
                    {...Struct.omit(props as TextFieldOptionalInputProps<A, R> | TextFieldInputProps<A, R>, "ref", "defaultValue")}
                />
            </Flex>

            {(!(input.optional && !input.enabled) && Option.isSome(issue)) &&
                <Callout.Root color="red" role="alert">
                    <Callout.Text>{issue.value.message}</Callout.Text>
                </Callout.Root>
            }
        </Flex>
    )
}).pipe(Memo.memo)
