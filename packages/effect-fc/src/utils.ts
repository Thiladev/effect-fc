export type ExcludeKeys<T, K extends PropertyKey> = K extends keyof T ? (
    { [P in K]?: never } & Omit<T, K>
) : T
