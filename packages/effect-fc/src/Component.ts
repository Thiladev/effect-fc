/** biome-ignore-all lint/complexity/noBannedTypes: {} is the default type for React props */
/** biome-ignore-all lint/complexity/useArrowFunction: necessary for class prototypes */
import { Context, Effect, Effectable, ExecutionStrategy, Function, Predicate, Runtime, Scope, Tracer, type Types, type Utils } from "effect"
import * as React from "react"
import * as Hooks from "./Hooks/index.js"
import { Memoized } from "./index.js"


export const TypeId: unique symbol = Symbol.for("effect-fc/Component")
export type TypeId = typeof TypeId

export interface Component<P extends {}, A extends React.ReactNode, E, R>
extends
    Effect.Effect<(props: P) => A, never, Exclude<R, Scope.Scope>>,
    Component.Options
{
    new(_: never): Record<string, never>
    readonly [TypeId]: TypeId
    readonly "~Props": P
    readonly "~Success": A
    readonly "~Error": E
    readonly "~Context": R

    /** @internal */
    readonly body: (props: P) => Effect.Effect<A, E, R>

    /** @internal */
    makeFunctionComponent(
        runtimeRef: React.Ref<Runtime.Runtime<Exclude<R, Scope.Scope>>>,
        scope: Scope.Scope,
    ): (props: P) => A
}

export namespace Component {
    export type Props<T extends Component<any, any, any, any>> = [T] extends [Component<infer P, infer _A, infer _E, infer _R>] ? P : never
    export type Success<T extends Component<any, any, any, any>> = [T] extends [Component<infer _P, infer A, infer _E, infer _R>] ? A : never
    export type Error<T extends Component<any, any, any, any>> = [T] extends [Component<infer _P, infer _A, infer E, infer _R>] ? E : never
    export type Context<T extends Component<any, any, any, any>> = [T] extends [Component<infer _P, infer _A, infer _E, infer R>] ? R : never

    export type AsComponent<T extends Component<any, any, any, any>> = Component<Props<T>, Success<T>, Error<T>, Context<T>>

    export interface Options {
        readonly displayName?: string
        readonly finalizerExecutionMode: "sync" | "fork"
        readonly finalizerExecutionStrategy: ExecutionStrategy.ExecutionStrategy
    }
}


const ComponentProto = Object.freeze({
    ...Effectable.CommitPrototype,
    [TypeId]: TypeId,

    commit: Effect.fnUntraced(function* <P extends {}, A extends React.ReactNode, E, R>(
        this: Component<P, A, E, R>
    ) {
        const self = this
        // biome-ignore lint/style/noNonNullAssertion: React ref initialization
        const runtimeRef = React.useRef<Runtime.Runtime<Exclude<R, Scope.Scope>>>(null!)
        runtimeRef.current = yield* Effect.runtime<Exclude<R, Scope.Scope>>()

        return React.useRef(function ScopeProvider(props: P) {
            const scope = Runtime.runSync(runtimeRef.current)(Hooks.useScope(
                Array.from(
                    Context.omit(...nonReactiveTags)(runtimeRef.current.context).unsafeMap.values()
                ),
                self,
            ))

            const FC = React.useMemo(() => {
                const f: React.FC<P> = self.makeFunctionComponent(runtimeRef, scope)
                f.displayName = self.displayName ?? "Anonymous"
                return Memoized.isMemoized(self)
                    ? React.memo(f, self.propsAreEqual)
                    : f
            }, [scope])

            return React.createElement(FC, props)
        }).current
    }),

    makeFunctionComponent<P extends {}, A extends React.ReactNode, E, R>(
        this: Component<P, A, E, R>,
        runtimeRef: React.RefObject<Runtime.Runtime<Exclude<R, Scope.Scope>>>,
        scope: Scope.Scope,
    ) {
        return (props: P) => Runtime.runSync(runtimeRef.current)(
            Effect.provideService(this.body(props), Scope.Scope, scope)
        )
    },
} as const)

const defaultOptions = {
    finalizerExecutionMode: "sync",
    finalizerExecutionStrategy: ExecutionStrategy.sequential,
} as const

const nonReactiveTags = [Tracer.ParentSpan] as const


export const isComponent = (u: unknown): u is Component<{}, React.ReactNode, unknown, unknown> => Predicate.hasProperty(u, TypeId)

export namespace make {
    export type Gen = {
        <Eff extends Utils.YieldWrap<Effect.Effect<any, any, any>>, A extends React.ReactNode, P extends {} = {}>(
            body: (props: P) => Generator<Eff, A, never>
        ): Component<
            P, A,
            [Eff] extends [never] ? never : [Eff] extends [Utils.YieldWrap<Effect.Effect<infer _A, infer E, infer _R>>] ? E : never,
            [Eff] extends [never] ? never : [Eff] extends [Utils.YieldWrap<Effect.Effect<infer _A, infer _E, infer R>>] ? R : never
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
            ) => B,
        ): Component<P, Effect.Effect.Success<Effect.Effect.AsEffect<B>>, Effect.Effect.Error<B>, Effect.Effect.Context<B>>
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
        ): Component<P, Effect.Effect.Success<Effect.Effect.AsEffect<C>>, Effect.Effect.Error<C>, Effect.Effect.Context<C>>
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
        ): Component<P, Effect.Effect.Success<Effect.Effect.AsEffect<D>>, Effect.Effect.Error<D>, Effect.Effect.Context<D>>
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
        ): Component<P, Effect.Effect.Success<Effect.Effect.AsEffect<E>>, Effect.Effect.Error<E>, Effect.Effect.Context<E>>
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
        ): Component<P, Effect.Effect.Success<Effect.Effect.AsEffect<F>>, Effect.Effect.Error<F>, Effect.Effect.Context<F>>
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
        ): Component<P, Effect.Effect.Success<Effect.Effect.AsEffect<G>>, Effect.Effect.Error<G>, Effect.Effect.Context<G>>
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
        ): Component<P, Effect.Effect.Success<Effect.Effect.AsEffect<H>>, Effect.Effect.Error<H>, Effect.Effect.Context<H>>
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
        ): Component<P, Effect.Effect.Success<Effect.Effect.AsEffect<I>>, Effect.Effect.Error<I>, Effect.Effect.Context<I>>
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
        ): Component<P, Effect.Effect.Success<Effect.Effect.AsEffect<J>>, Effect.Effect.Error<J>, Effect.Effect.Context<J>>
    }

    export type NonGen = {
        <Eff extends Effect.Effect<React.ReactNode, any, any>, P extends {} = {}>(
            body: (props: P) => Eff
        ): Component<P, Effect.Effect.Success<Effect.Effect.AsEffect<Eff>>, Effect.Effect.Error<Eff>, Effect.Effect.Context<Eff>>
        <Eff extends Effect.Effect<React.ReactNode, any, any>, A, P extends {} = {}>(
            body: (props: P) => A,
            a: (_: A, props: NoInfer<P>) => Eff,
        ): Component<P, Effect.Effect.Success<Effect.Effect.AsEffect<Eff>>, Effect.Effect.Error<Eff>, Effect.Effect.Context<Eff>>
        <Eff extends Effect.Effect<React.ReactNode, any, any>, A, B, P extends {} = {}>(
            body: (props: P) => A,
            a: (_: A, props: NoInfer<P>) => B,
            b: (_: B, props: NoInfer<P>) => Eff,
        ): Component<P, Effect.Effect.Success<Effect.Effect.AsEffect<Eff>>, Effect.Effect.Error<Eff>, Effect.Effect.Context<Eff>>
        <Eff extends Effect.Effect<React.ReactNode, any, any>, A, B, C, P extends {} = {}>(
            body: (props: P) => A,
            a: (_: A, props: NoInfer<P>) => B,
            b: (_: B, props: NoInfer<P>) => C,
            c: (_: C, props: NoInfer<P>) => Eff,
        ): Component<P, Effect.Effect.Success<Effect.Effect.AsEffect<Eff>>, Effect.Effect.Error<Eff>, Effect.Effect.Context<Eff>>
        <Eff extends Effect.Effect<React.ReactNode, any, any>, A, B, C, D, P extends {} = {}>(
            body: (props: P) => A,
            a: (_: A, props: NoInfer<P>) => B,
            b: (_: B, props: NoInfer<P>) => C,
            c: (_: C, props: NoInfer<P>) => D,
            d: (_: D, props: NoInfer<P>) => Eff,
        ): Component<P, Effect.Effect.Success<Effect.Effect.AsEffect<Eff>>, Effect.Effect.Error<Eff>, Effect.Effect.Context<Eff>>
        <Eff extends Effect.Effect<React.ReactNode, any, any>, A, B, C, D, E, P extends {} = {}>(
            body: (props: P) => A,
            a: (_: A, props: NoInfer<P>) => B,
            b: (_: B, props: NoInfer<P>) => C,
            c: (_: C, props: NoInfer<P>) => D,
            d: (_: D, props: NoInfer<P>) => E,
            e: (_: E, props: NoInfer<P>) => Eff,
        ): Component<P, Effect.Effect.Success<Effect.Effect.AsEffect<Eff>>, Effect.Effect.Error<Eff>, Effect.Effect.Context<Eff>>
        <Eff extends Effect.Effect<React.ReactNode, any, any>, A, B, C, D, E, F, P extends {} = {}>(
            body: (props: P) => A,
            a: (_: A, props: NoInfer<P>) => B,
            b: (_: B, props: NoInfer<P>) => C,
            c: (_: C, props: NoInfer<P>) => D,
            d: (_: D, props: NoInfer<P>) => E,
            e: (_: E, props: NoInfer<P>) => F,
            f: (_: F, props: NoInfer<P>) => Eff,
        ): Component<P, Effect.Effect.Success<Effect.Effect.AsEffect<Eff>>, Effect.Effect.Error<Eff>, Effect.Effect.Context<Eff>>
        <Eff extends Effect.Effect<React.ReactNode, any, any>, A, B, C, D, E, F, G, P extends {} = {}>(
            body: (props: P) => A,
            a: (_: A, props: NoInfer<P>) => B,
            b: (_: B, props: NoInfer<P>) => C,
            c: (_: C, props: NoInfer<P>) => D,
            d: (_: D, props: NoInfer<P>) => E,
            e: (_: E, props: NoInfer<P>) => F,
            f: (_: F, props: NoInfer<P>) => G,
            g: (_: G, props: NoInfer<P>) => Eff,
        ): Component<P, Effect.Effect.Success<Effect.Effect.AsEffect<Eff>>, Effect.Effect.Error<Eff>, Effect.Effect.Context<Eff>>
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
        ): Component<P, Effect.Effect.Success<Effect.Effect.AsEffect<Eff>>, Effect.Effect.Error<Eff>, Effect.Effect.Context<Eff>>
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
        ): Component<P, Effect.Effect.Success<Effect.Effect.AsEffect<Eff>>, Effect.Effect.Error<Eff>, Effect.Effect.Context<Eff>>
    }
}

export const make: (
    & make.Gen
    & make.NonGen
    & ((
        spanName: string,
        spanOptions?: Tracer.SpanOptions,
    ) => make.Gen & make.NonGen)
) = (spanNameOrBody: Function | string, ...pipeables: any[]): any => {
    if (typeof spanNameOrBody !== "string") {
        return Object.setPrototypeOf(
            Object.assign(function() {}, defaultOptions, {
                body: Effect.fn(spanNameOrBody as any, ...pipeables),
            }),
            ComponentProto,
        )
    }
    else {
        const spanOptions = pipeables[0]
        return (body: any, ...pipeables: any[]) => Object.setPrototypeOf(
            Object.assign(function() {}, defaultOptions, {
                body: Effect.fn(spanNameOrBody, spanOptions)(body, ...pipeables as []),
                displayName: spanNameOrBody,
            }),
            ComponentProto,
        )
    }
}

export const makeUntraced: (
    & make.Gen
    & make.NonGen
    & ((name: string) => make.Gen & make.NonGen)
) = (spanNameOrBody: Function | string, ...pipeables: any[]): any => (
    typeof spanNameOrBody !== "string"
        ? Object.setPrototypeOf(
            Object.assign(function() {}, defaultOptions, {
                body: Effect.fnUntraced(spanNameOrBody as any, ...pipeables as []),
            }),
            ComponentProto,
        )
        : (body: any, ...pipeables: any[]) => Object.setPrototypeOf(
            Object.assign(function() {}, defaultOptions, {
                body: Effect.fnUntraced(body, ...pipeables as []),
                displayName: spanNameOrBody,
            }),
            ComponentProto,
        )
)

export const withOptions: {
    <T extends Component<any, any, any, any>>(
        options: Partial<Component.Options>
    ): (self: T) => T
    <T extends Component<any, any, any, any>>(
        self: T,
        options: Partial<Component.Options>,
    ): T
} = Function.dual(2, <T extends Component<any, any, any, any>>(
    self: T,
    options: Partial<Component.Options>,
): T => Object.setPrototypeOf(
    Object.assign(function() {}, self, options),
    Object.getPrototypeOf(self),
))

export const withRuntime: {
    <P extends {}, A extends React.ReactNode, E, R>(
        context: React.Context<Runtime.Runtime<R>>,
    ): (self: Component<P, A, E, Types.NoInfer<R>>) => (props: P) => A
    <P extends {}, A extends React.ReactNode, E, R>(
        self: Component<P, A, E, Types.NoInfer<R>>,
        context: React.Context<Runtime.Runtime<R>>,
    ): (props: P) => A
} = Function.dual(2, <P extends {}, A extends React.ReactNode, E, R>(
    self: Component<P, A, E, R>,
    context: React.Context<Runtime.Runtime<R>>,
) => function WithRuntime(props: P) {
    return React.createElement(
        Runtime.runSync(React.useContext(context))(self),
        props,
    )
})

export const useOnMount: {
    <A, E, R>(
        f: () => Effect.Effect<A, E, R>
    ): Effect.Effect<A, E, R>
} = Effect.fnUntraced(function* <A, E, R>(
    f: () => Effect.Effect<A, E, R>
) {
    const runtime = yield* Effect.runtime<R>()
    // biome-ignore lint/correctness/useExhaustiveDependencies: only computed on mount
    return yield* React.useMemo(() => Runtime.runSync(runtime)(Effect.cached(f())), [])
})

export const useOnChange: {
    <A, E, R>(
        f: () => Effect.Effect<A, E, R>,
        deps: React.DependencyList,
    ): Effect.Effect<A, E, R>
} = Effect.fnUntraced(function* <A, E, R>(
    f: () => Effect.Effect<A, E, R>,
    deps: React.DependencyList,
) {
    const runtime = yield* Effect.runtime<R>()
    // biome-ignore lint/correctness/useExhaustiveDependencies: "f" is non-reactive
    return yield* React.useMemo(() => Runtime.runSync(runtime)(Effect.cached(f())), deps)
})
