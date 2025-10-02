import { Array, Equivalence, Function, Option, Predicate } from "effect"


export type PropertyPath = readonly PropertyKey[]

type Prev = readonly [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

export type Paths<T, D extends number = 5, Seen = never> = readonly [] | (
    D extends never ? readonly [] :
    T extends Seen ? readonly [] :
    T extends readonly any[] ? {
        [K in keyof T as K extends number ? K : never]:
            | readonly [K]
            | readonly [K, ...Paths<T[K], Prev[D], Seen | T>]
    } extends infer O
        ? O[keyof O]
        : never
    :
    T extends object ? {
        [K in keyof T as K extends string | number | symbol ? K : never]-?:
            NonNullable<T[K]> extends infer V
                ? readonly [K] | readonly [K, ...Paths<V, Prev[D], Seen>]
                : never
    } extends infer O
        ? O[keyof O]
        : never
    :
    never
)

export type ValueFromPath<T, P extends readonly any[]> = P extends readonly [infer Head, ...infer Tail]
    ? Head extends keyof T
        ? ValueFromPath<T[Head], Tail>
        : T extends readonly any[]
            ? Head extends number
                ? ValueFromPath<T[number], Tail>
                : never
            : never
    : T


export const equivalence: Equivalence.Equivalence<PropertyPath> = Equivalence.array(Equivalence.strict())

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
    <T, const P extends Paths<T>>(path: P, value: ValueFromPath<T, P>): (self: T) => Option.Option<T>
    <T, const P extends Paths<T>>(self: T, path: P, value: ValueFromPath<T, P>): Option.Option<T>
} = Function.dual(3, <T, const P extends Paths<T>>(self: T, path: P, value: ValueFromPath<T, P>): Option.Option<T> => {
    const key = Array.head(path as PropertyPath)
    if (Option.isNone(key))
        return Option.some(value as T)
    if (!Predicate.hasProperty(self, key.value))
        return Option.none()

    const child = immutableSet<any, any>(self[key.value], Option.getOrThrow(Array.tail(path as PropertyPath)), value)
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
