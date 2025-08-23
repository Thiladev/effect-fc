import { Array, Function, Option, Predicate } from "effect"


type Prev = readonly [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

export type Paths<T, D extends number = 5, Seen = never> = [] | (
    D extends never ? [] :
    T extends Seen ? [] :
    T extends readonly any[] ? ArrayPaths<T, D, Seen | T> :
    T extends object ? ObjectPaths<T, D, Seen | T> :
    never
)

export type ArrayPaths<T extends readonly any[], D extends number, Seen> = {
    [K in keyof T as K extends number ? K : never]:
        | [K]
        | [K, ...Paths<T[K], Prev[D], Seen>]
} extends infer O
    ? O[keyof O]
    : never

export type ObjectPaths<T extends object, D extends number, Seen> = {
    [K in keyof T as K extends string | number | symbol ? K : never]-?:
        NonNullable<T[K]> extends infer V
            ? [K] | [K, ...Paths<V, Prev[D], Seen>]
            : never
} extends infer O
    ? O[keyof O]
    : never

export type ValueFromPath<T, P extends any[]> = P extends [infer Head, ...infer Tail]
    ? Head extends keyof T
        ? ValueFromPath<T[Head], Tail>
        : T extends readonly any[]
            ? Head extends number
                ? ValueFromPath<T[number], Tail>
                : never
            : never
    : T

export type AnyPath = readonly PropertyKey[]


export const unsafeGet: {
    <T, const P extends Paths<T>>(path: P): (self: T) => ValueFromPath<T, P>
    <T, const P extends Paths<T>>(self: T, path: P): ValueFromPath<T, P>
} = Function.dual(2, <T, const P extends Paths<T>>(self: T, path: P): ValueFromPath<T, P> =>
    path.reduce((acc: any, key: any) => acc?.[key], self)
)

export const get: {
    <T, const P extends Paths<T>>(path: P): (self: T) => Option.Option<ValueFromPath<T, P>>
    <T, const P extends Paths<T>>(self: T, path: P): Option.Option<ValueFromPath<T, P>>
} = Function.dual(2, <T, const P extends Paths<T>>(self: T, path: P): Option.Option<ValueFromPath<T, P>> =>
    path.reduce(
        (acc: Option.Option<any>, key: any): Option.Option<any> => Option.isSome(acc)
            ? Predicate.hasProperty(acc.value, key)
                ? Option.some(acc.value[key])
                : Option.none()
            : acc,

        Option.some(self),
    )
)

export const immutableSet: {
    <T, const P extends Paths<T>>(path: P, value: ValueFromPath<T, P>): (self: T) => ValueFromPath<T, P>
    <T, const P extends Paths<T>>(self: T, path: P, value: ValueFromPath<T, P>): Option.Option<T>
} = Function.dual(3, <T, const P extends Paths<T>>(self: T, path: P, value: ValueFromPath<T, P>): Option.Option<T> => {
    const key = Array.head(path as AnyPath)
    if (Option.isNone(key))
        return Option.some(value as T)
    if (!Predicate.hasProperty(self, key.value))
        return Option.none()

    const child = immutableSet<any, any>(self[key.value], Option.getOrThrow(Array.tail(path as AnyPath)), value)
    if (Option.isNone(child))
        return child

    if (Array.isArray(self))
        return typeof key.value === "number"
            ? Option.some([
                ...self.slice(0, key.value),
                child.value,
                ...self.slice(key.value + 1),
            ] as T)
            : Option.none()

    if (typeof self === "object")
        return Option.some(
            Object.assign(
                Object.create(Object.getPrototypeOf(self)),
                { ...self, [key.value]: child.value },
            )
        )

    return Option.none()
})
