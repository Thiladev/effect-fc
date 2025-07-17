import { Context, Effect, type Equivalence, ExecutionStrategy, Function, pipe, Pipeable, Predicate, Runtime, Scope, String, Tracer, type Utils } from "effect"
import * as React from "react"
import * as Hook from "./Hook.js"
import type { ExcludeKeys } from "./utils.js"


export interface Component<E, R, P extends {}> extends Pipeable.Pipeable {
    readonly body: (props: P) => Effect.Effect<React.ReactNode, E, R>
    readonly displayName?: string
    readonly options: Component.Options
}

export namespace Component {
    export type Error<T> = T extends Component<infer E, infer _R, infer _P> ? E : never
    export type Context<T> = T extends Component<infer _E, infer R, infer _P> ? R : never
    export type Props<T> = T extends Component<infer _E, infer _R, infer P> ? P : never

    export interface Options {
        readonly finalizerExecutionMode: "sync" | "fork"
        readonly finalizerExecutionStrategy: ExecutionStrategy.ExecutionStrategy
    }
}


const ComponentProto = Object.seal({
    pipe() { return Pipeable.pipeArguments(this, arguments) }
} as const)

const defaultOptions: Component.Options = {
    finalizerExecutionMode: "sync",
    finalizerExecutionStrategy: ExecutionStrategy.sequential,
}

const nonReactiveTags = [Tracer.ParentSpan] as const


export namespace make {
    export type Gen = {
        <Eff extends Utils.YieldWrap<Effect.Effect<any, any, any>>, P extends {} = {}>(
            body: (props: P) => Generator<Eff, React.ReactNode, never>,
        ): Component<
            [Eff] extends [never] ? never : [Eff] extends [Utils.YieldWrap<Effect.Effect<infer _A, infer E, infer _R>>] ? E : never,
            [Eff] extends [never] ? never : [Eff] extends [Utils.YieldWrap<Effect.Effect<infer _A, infer _E, infer R>>] ? R : never,
            P
        >
        <Eff extends Utils.YieldWrap<Effect.Effect<any, any, any>>, A, B extends Effect.Effect<React.ReactNode, any, any>, P extends {} = {}>(
            body: (props: P) => Generator<Eff, A, never>,
            a: (
                _: Effect.Effect<
                    A,
                    [Eff] extends [never] ? never : [Eff] extends [Utils.YieldWrap<Effect.Effect<infer _A, infer E, infer _R>>] ? E : never,
                    [Eff] extends [never] ? never : [Eff] extends [Utils.YieldWrap<Effect.Effect<infer _A, infer _E, infer R>>] ? R : never
                >,
                props: NoInfer<P>,
            ) => B
        ): Component<Effect.Effect.Error<B>, Effect.Effect.Context<B>, P>
        <Eff extends Utils.YieldWrap<Effect.Effect<any, any, any>>, A, B, C extends Effect.Effect<React.ReactNode, any, any>, P extends {} = {}>(
            body: (props: P) => Generator<Eff, A, never>,
            a: (
                _: Effect.Effect<
                    A,
                    [Eff] extends [never] ? never : [Eff] extends [Utils.YieldWrap<Effect.Effect<infer _A, infer E, infer _R>>] ? E : never,
                    [Eff] extends [never] ? never : [Eff] extends [Utils.YieldWrap<Effect.Effect<infer _A, infer _E, infer R>>] ? R : never
                >,
                props: NoInfer<P>,
            ) => B,
            b: (_: B, props: NoInfer<P>) => C,
        ): Component<Effect.Effect.Error<C>, Effect.Effect.Context<C>, P>
        <Eff extends Utils.YieldWrap<Effect.Effect<any, any, any>>, A, B, C, D extends Effect.Effect<React.ReactNode, any, any>, P extends {} = {}>(
            body: (props: P) => Generator<Eff, A, never>,
            a: (
                _: Effect.Effect<
                    A,
                    [Eff] extends [never] ? never : [Eff] extends [Utils.YieldWrap<Effect.Effect<infer _A, infer E, infer _R>>] ? E : never,
                    [Eff] extends [never] ? never : [Eff] extends [Utils.YieldWrap<Effect.Effect<infer _A, infer _E, infer R>>] ? R : never
                >,
                props: NoInfer<P>,
            ) => B,
            b: (_: B, props: NoInfer<P>) => C,
            c: (_: C, props: NoInfer<P>) => D,
        ): Component<Effect.Effect.Error<D>, Effect.Effect.Context<D>, P>
        <Eff extends Utils.YieldWrap<Effect.Effect<any, any, any>>, A, B, C, D, E extends Effect.Effect<React.ReactNode, any, any>, P extends {} = {}>(
            body: (props: P) => Generator<Eff, A, never>,
            a: (
                _: Effect.Effect<
                    A,
                    [Eff] extends [never] ? never : [Eff] extends [Utils.YieldWrap<Effect.Effect<infer _A, infer E, infer _R>>] ? E : never,
                    [Eff] extends [never] ? never : [Eff] extends [Utils.YieldWrap<Effect.Effect<infer _A, infer _E, infer R>>] ? R : never
                >,
                props: NoInfer<P>,
            ) => B,
            b: (_: B, props: NoInfer<P>) => C,
            c: (_: C, props: NoInfer<P>) => D,
            d: (_: D, props: NoInfer<P>) => E,
        ): Component<Effect.Effect.Error<E>, Effect.Effect.Context<E>, P>
        <Eff extends Utils.YieldWrap<Effect.Effect<any, any, any>>, A, B, C, D, E, F extends Effect.Effect<React.ReactNode, any, any>, P extends {} = {}>(
            body: (props: P) => Generator<Eff, A, never>,
            a: (
                _: Effect.Effect<
                    A,
                    [Eff] extends [never] ? never : [Eff] extends [Utils.YieldWrap<Effect.Effect<infer _A, infer E, infer _R>>] ? E : never,
                    [Eff] extends [never] ? never : [Eff] extends [Utils.YieldWrap<Effect.Effect<infer _A, infer _E, infer R>>] ? R : never
                >,
                props: NoInfer<P>,
            ) => B,
            b: (_: B, props: NoInfer<P>) => C,
            c: (_: C, props: NoInfer<P>) => D,
            d: (_: D, props: NoInfer<P>) => E,
            e: (_: E, props: NoInfer<P>) => F,
        ): Component<Effect.Effect.Error<F>, Effect.Effect.Context<F>, P>
        <Eff extends Utils.YieldWrap<Effect.Effect<any, any, any>>, A, B, C, D, E, F, G extends Effect.Effect<React.ReactNode, any, any>, P extends {} = {}>(
            body: (props: P) => Generator<Eff, A, never>,
            a: (
                _: Effect.Effect<
                    A,
                    [Eff] extends [never] ? never : [Eff] extends [Utils.YieldWrap<Effect.Effect<infer _A, infer E, infer _R>>] ? E : never,
                    [Eff] extends [never] ? never : [Eff] extends [Utils.YieldWrap<Effect.Effect<infer _A, infer _E, infer R>>] ? R : never
                >,
                props: NoInfer<P>,
            ) => B,
            b: (_: B, props: NoInfer<P>) => C,
            c: (_: C, props: NoInfer<P>) => D,
            d: (_: D, props: NoInfer<P>) => E,
            e: (_: E, props: NoInfer<P>) => F,
            f: (_: F, props: NoInfer<P>) => G,
        ): Component<Effect.Effect.Error<G>, Effect.Effect.Context<G>, P>
        <Eff extends Utils.YieldWrap<Effect.Effect<any, any, any>>, A, B, C, D, E, F, G, H extends Effect.Effect<React.ReactNode, any, any>, P extends {} = {}>(
            body: (props: P) => Generator<Eff, A, never>,
            a: (
                _: Effect.Effect<
                    A,
                    [Eff] extends [never] ? never : [Eff] extends [Utils.YieldWrap<Effect.Effect<infer _A, infer E, infer _R>>] ? E : never,
                    [Eff] extends [never] ? never : [Eff] extends [Utils.YieldWrap<Effect.Effect<infer _A, infer _E, infer R>>] ? R : never
                >,
                props: NoInfer<P>,
            ) => B,
            b: (_: B, props: NoInfer<P>) => C,
            c: (_: C, props: NoInfer<P>) => D,
            d: (_: D, props: NoInfer<P>) => E,
            e: (_: E, props: NoInfer<P>) => F,
            f: (_: F, props: NoInfer<P>) => G,
            g: (_: G, props: NoInfer<P>) => H,
        ): Component<Effect.Effect.Error<H>, Effect.Effect.Context<H>, P>
        <Eff extends Utils.YieldWrap<Effect.Effect<any, any, any>>, A, B, C, D, E, F, G, H, I extends Effect.Effect<React.ReactNode, any, any>, P extends {} = {}>(
            body: (props: P) => Generator<Eff, A, never>,
            a: (
                _: Effect.Effect<
                    A,
                    [Eff] extends [never] ? never : [Eff] extends [Utils.YieldWrap<Effect.Effect<infer _A, infer E, infer _R>>] ? E : never,
                    [Eff] extends [never] ? never : [Eff] extends [Utils.YieldWrap<Effect.Effect<infer _A, infer _E, infer R>>] ? R : never
                >,
                props: NoInfer<P>,
            ) => B,
            b: (_: B, props: NoInfer<P>) => C,
            c: (_: C, props: NoInfer<P>) => D,
            d: (_: D, props: NoInfer<P>) => E,
            e: (_: E, props: NoInfer<P>) => F,
            f: (_: F, props: NoInfer<P>) => G,
            g: (_: G, props: NoInfer<P>) => H,
            h: (_: H, props: NoInfer<P>) => I,
        ): Component<Effect.Effect.Error<I>, Effect.Effect.Context<I>, P>
        <Eff extends Utils.YieldWrap<Effect.Effect<any, any, any>>, A, B, C, D, E, F, G, H, I, J extends Effect.Effect<React.ReactNode, any, any>, P extends {} = {}>(
            body: (props: P) => Generator<Eff, A, never>,
            a: (
                _: Effect.Effect<
                    A,
                    [Eff] extends [never] ? never : [Eff] extends [Utils.YieldWrap<Effect.Effect<infer _A, infer E, infer _R>>] ? E : never,
                    [Eff] extends [never] ? never : [Eff] extends [Utils.YieldWrap<Effect.Effect<infer _A, infer _E, infer R>>] ? R : never
                >,
                props: NoInfer<P>,
            ) => B,
            b: (_: B, props: NoInfer<P>) => C,
            c: (_: C, props: NoInfer<P>) => D,
            d: (_: D, props: NoInfer<P>) => E,
            e: (_: E, props: NoInfer<P>) => F,
            f: (_: F, props: NoInfer<P>) => G,
            g: (_: G, props: NoInfer<P>) => H,
            h: (_: H, props: NoInfer<P>) => I,
            i: (_: I, props: NoInfer<P>) => J,
        ): Component<Effect.Effect.Error<J>, Effect.Effect.Context<J>, P>
    }

    export type NonGen = {
        <Eff extends Effect.Effect<React.ReactNode, any, any>, P extends {} = {}>(
            body: (props: P) => Eff
        ): Component<Effect.Effect.Error<Eff>, Effect.Effect.Context<Eff>, P>
        <Eff extends Effect.Effect<React.ReactNode, any, any>, A, P extends {} = {}>(
            body: (props: P) => A,
            a: (_: A, props: NoInfer<P>) => Eff,
        ): Component<Effect.Effect.Error<Eff>, Effect.Effect.Context<Eff>, P>
        <Eff extends Effect.Effect<React.ReactNode, any, any>, A, B, P extends {} = {}>(
            body: (props: P) => A,
            a: (_: A, props: NoInfer<P>) => B,
            b: (_: B, props: NoInfer<P>) => Eff,
        ): Component<Effect.Effect.Error<Eff>, Effect.Effect.Context<Eff>, P>
        <Eff extends Effect.Effect<React.ReactNode, any, any>, A, B, C, P extends {} = {}>(
            body: (props: P) => A,
            a: (_: A, props: NoInfer<P>) => B,
            b: (_: B, props: NoInfer<P>) => C,
            c: (_: C, props: NoInfer<P>) => Eff,
        ): Component<Effect.Effect.Error<Eff>, Effect.Effect.Context<Eff>, P>
        <Eff extends Effect.Effect<React.ReactNode, any, any>, A, B, C, D, P extends {} = {}>(
            body: (props: P) => A,
            a: (_: A, props: NoInfer<P>) => B,
            b: (_: B, props: NoInfer<P>) => C,
            c: (_: C, props: NoInfer<P>) => D,
            d: (_: D, props: NoInfer<P>) => Eff,
        ): Component<Effect.Effect.Error<Eff>, Effect.Effect.Context<Eff>, P>
        <Eff extends Effect.Effect<React.ReactNode, any, any>, A, B, C, D, E, P extends {} = {}>(
            body: (props: P) => A,
            a: (_: A, props: NoInfer<P>) => B,
            b: (_: B, props: NoInfer<P>) => C,
            c: (_: C, props: NoInfer<P>) => D,
            d: (_: D, props: NoInfer<P>) => E,
            e: (_: E, props: NoInfer<P>) => Eff,
        ): Component<Effect.Effect.Error<Eff>, Effect.Effect.Context<Eff>, P>
        <Eff extends Effect.Effect<React.ReactNode, any, any>, A, B, C, D, E, F, P extends {} = {}>(
            body: (props: P) => A,
            a: (_: A, props: NoInfer<P>) => B,
            b: (_: B, props: NoInfer<P>) => C,
            c: (_: C, props: NoInfer<P>) => D,
            d: (_: D, props: NoInfer<P>) => E,
            e: (_: E, props: NoInfer<P>) => F,
            f: (_: F, props: NoInfer<P>) => Eff,
        ): Component<Effect.Effect.Error<Eff>, Effect.Effect.Context<Eff>, P>
        <Eff extends Effect.Effect<React.ReactNode, any, any>, A, B, C, D, E, F, G, P extends {} = {}>(
            body: (props: P) => A,
            a: (_: A, props: NoInfer<P>) => B,
            b: (_: B, props: NoInfer<P>) => C,
            c: (_: C, props: NoInfer<P>) => D,
            d: (_: D, props: NoInfer<P>) => E,
            e: (_: E, props: NoInfer<P>) => F,
            f: (_: F, props: NoInfer<P>) => G,
            g: (_: G, props: NoInfer<P>) => Eff,
        ): Component<Effect.Effect.Error<Eff>, Effect.Effect.Context<Eff>, P>
        <Eff extends Effect.Effect<React.ReactNode, any, any>, A, B, C, D, E, F, G, H, P extends {} = {}>(
            body: (props: P) => A,
            a: (_: A, props: NoInfer<P>) => B,
            b: (_: B, props: NoInfer<P>) => C,
            c: (_: C, props: NoInfer<P>) => D,
            d: (_: D, props: NoInfer<P>) => E,
            e: (_: E, props: NoInfer<P>) => F,
            f: (_: F, props: NoInfer<P>) => G,
            g: (_: G, props: NoInfer<P>) => H,
            h: (_: H, props: NoInfer<P>) => Eff,
        ): Component<Effect.Effect.Error<Eff>, Effect.Effect.Context<Eff>, P>
        <Eff extends Effect.Effect<React.ReactNode, any, any>, A, B, C, D, E, F, G, H, I, P extends {} = {}>(
            body: (props: P) => A,
            a: (_: A, props: NoInfer<P>) => B,
            b: (_: B, props: NoInfer<P>) => C,
            c: (_: C, props: NoInfer<P>) => D,
            d: (_: D, props: NoInfer<P>) => E,
            e: (_: E, props: NoInfer<P>) => F,
            f: (_: F, props: NoInfer<P>) => G,
            g: (_: G, props: NoInfer<P>) => H,
            h: (_: H, props: NoInfer<P>) => I,
            i: (_: I, props: NoInfer<P>) => Eff,
        ): Component<Effect.Effect.Error<Eff>, Effect.Effect.Context<Eff>, P>
    }
}

export const make: (
    & make.Gen
    & make.NonGen
    & ((
        spanName: string,
        spanOptions?: Tracer.SpanOptions,
    ) => make.Gen & make.NonGen)
) = (spanNameOrBody: Function | string, ...pipeables: any[]) => {
    if (typeof spanNameOrBody !== "string") {
        const displayName = displayNameFromBody(spanNameOrBody)
        return Object.setPrototypeOf({
            body: displayName
                ? Effect.fn(displayName)(spanNameOrBody as any, ...pipeables as [])
                : Effect.fn(spanNameOrBody as any, ...pipeables),
            displayName,
            options: { ...defaultOptions },
        }, ComponentProto)
    }
    else {
        const spanOptions = pipeables[0]
        return (body: any, ...pipeables: any[]) => Object.setPrototypeOf({
            body: Effect.fn(spanNameOrBody, spanOptions)(body, ...pipeables as []),
            displayName: displayNameFromBody(body) ?? spanNameOrBody,
            options: { ...defaultOptions },
        }, ComponentProto)
    }
}

export const makeUntraced: make.Gen & make.NonGen = (body: Function, ...pipeables: any[]) => Object.setPrototypeOf({
    body: Effect.fnUntraced(body as any, ...pipeables as []),
    displayName: displayNameFromBody(body),
    options: { ...defaultOptions },
}, ComponentProto)

const displayNameFromBody = (body: Function) => !String.isEmpty(body.name) ? body.name : undefined


export const withDisplayName: {
    <T extends Component<any, any, any>>(
        displayName: string
    ): (self: T) => T
    <T extends Component<any, any, any>>(
        self: T,
        displayName: string,
    ): T
} = Function.dual(2, <T extends Component<any, any, any>>(
    self: T,
    displayName: string,
): T => Object.setPrototypeOf(
    { ...self, displayName },
    Object.getPrototypeOf(self),
))

export const withOptions: {
    <T extends Component<any, any, any>>(
        options: Partial<Component.Options>
    ): (self: T) => T
    <T extends Component<any, any, any>>(
        self: T,
        options: Partial<Component.Options>,
    ): T
} = Function.dual(2, <T extends Component<any, any, any>>(
    self: T,
    options: Partial<Component.Options>,
): T => Object.setPrototypeOf(
    { ...self, options: { ...self.options, ...options } },
    Object.getPrototypeOf(self),
))

export const withRuntime: {
    <E, R, P extends {}>(
        context: React.Context<Runtime.Runtime<R>>,
    ): (self: Component<E, R | Scope.Scope, P>) => React.FC<P>
    <E, R, P extends {}>(
        self: Component<E, R | Scope.Scope, P>,
        context: React.Context<Runtime.Runtime<R>>,
    ): React.FC<P>
} = Function.dual(2, <E, R, P extends {}>(
    self: Component<E, R | Scope.Scope, P>,
    context: React.Context<Runtime.Runtime<R>>,
): React.FC<P> => function WithRuntime(props) {
    const runtime = React.useContext(context)
    return React.createElement(Runtime.runSync(runtime)(useFC(self)), props)
})


export interface Memoized<P> {
    readonly memo: true
    readonly memoOptions: Memoized.Options<P>
}

export namespace Memoized {
    export interface Options<P> {
        readonly propsAreEqual?: Equivalence.Equivalence<P>
    }
}

export const memo = <T extends Component<any, any, any>>(
    self: ExcludeKeys<T, keyof Memoized<Component.Props<T>>>
): T & Memoized<Component.Props<T>> => Object.setPrototypeOf(
    { ...self, memo: true, memoOptions: {} },
    Object.getPrototypeOf(self),
)

export const memoWithEquivalence: {
    <T extends Component<any, any, any>>(
        propsAreEqual: Equivalence.Equivalence<Component.Props<T>>
    ): (
        self: ExcludeKeys<T, keyof Memoized<Component.Props<T>>>
    ) => T & Memoized<Component.Props<T>>
    <T extends Component<any, any, any>>(
        self: ExcludeKeys<T, keyof Memoized<Component.Props<T>>>,
        propsAreEqual: Equivalence.Equivalence<Component.Props<T>>,
    ): T & Memoized<Component.Props<T>>
} = Function.dual(2, <T extends Component<any, any, any>>(
    self: ExcludeKeys<T, keyof Memoized<Component.Props<T>>>,
    propsAreEqual: Equivalence.Equivalence<Component.Props<T>>,
): T & Memoized<Component.Props<T>> => Object.setPrototypeOf(
    { ...self, memo: true, memoOptions: { propsAreEqual } },
    Object.getPrototypeOf(self),
))


export interface Suspense {
    readonly suspense: true
}

export type SuspenseProps = Omit<React.SuspenseProps, "children">

export const suspense = <T extends Component<any, any, P>, P extends {}>(
    self: ExcludeKeys<T, keyof Suspense> & Component<any, any, ExcludeKeys<P, keyof SuspenseProps>>
): T & Suspense => Object.setPrototypeOf(
    { ...self, suspense: true },
    Object.getPrototypeOf(self),
)


export const useFC: {
    <E, R, P extends {}>(
        self: Component<E, R, P> & Suspense
    ): Effect.Effect<React.FC<P & SuspenseProps>, never, Exclude<R, Scope.Scope>>
    <E, R, P extends {}>(
        self: Component<E, R, P>
    ): Effect.Effect<React.FC<P>, never, Exclude<R, Scope.Scope>>
} = Effect.fn("useFC")(function* <E, R, P extends {}>(
    self: Component<E, R, P> & (Memoized<P> | Suspense | {})
) {
    const runtimeRef = React.useRef<Runtime.Runtime<Exclude<R, Scope.Scope>>>(null!)
    runtimeRef.current = yield* Effect.runtime<Exclude<R, Scope.Scope>>()

    return React.useCallback(function ScopeProvider(props: P) {
        const scope = Runtime.runSync(runtimeRef.current)(Hook.useScope(
            Array.from(
                Context.omit(...nonReactiveTags)(runtimeRef.current.context).unsafeMap.values()
            ),
            self.options,
        ))

        const FC = React.useMemo(() => {
            const f: React.FC<P> = Predicate.hasProperty(self, "suspense")
                ? pipe(
                    function SuspenseInner(props: { readonly promise: Promise<React.ReactNode> }) {
                        return React.use(props.promise)
                    },

                    SuspenseInner => ({ fallback, name, ...props }: P & SuspenseProps) => {
                        const promise = Runtime.runPromise(runtimeRef.current)(
                            Effect.provideService(self.body(props as P), Scope.Scope, scope)
                        )

                        return React.createElement(
                            React.Suspense,
                            { fallback, name },
                            React.createElement(SuspenseInner, { promise }),
                        )
                    },
                )
                : (props: P) => Runtime.runSync(runtimeRef.current)(
                    Effect.provideService(self.body(props), Scope.Scope, scope)
                )

            f.displayName = self.displayName ?? "Anonymous"
            return Predicate.hasProperty(self, "memo")
                ? React.memo(f, self.memoOptions.propsAreEqual)
                : f
        }, [scope])

        return React.createElement(FC, props)
    }, [])
})

export const use: {
    <E, R, P extends {}>(
        self: Component<E, R, P> & Suspense,
        fn: (Component: React.FC<P & SuspenseProps>) => React.ReactNode,
    ): Effect.Effect<React.ReactNode, never, Exclude<R, Scope.Scope>>
    <E, R, P extends {}>(
        self: Component<E, R, P>,
        fn: (Component: React.FC<P>) => React.ReactNode,
    ): Effect.Effect<React.ReactNode, never, Exclude<R, Scope.Scope>>
} = Effect.fn("use")(function*(self, fn) {
    return fn(yield* useFC(self))
})
