import { Context, Effect, Effectable, ExecutionStrategy, Function, Predicate, Runtime, Scope, String, Tracer, type Utils } from "effect"
import * as React from "react"
import * as Hook from "./Hook.js"
import * as Memoized from "./Memoized.js"


export const TypeId: unique symbol = Symbol.for("effect-fc/Component")
export type TypeId = typeof TypeId

export interface Component<P extends {} = {}, E = never, R = never>
extends Effect.Effect<React.FC<P>, never, Exclude<R, Scope.Scope>>, Component.Options {
    new(_: never): {}
    readonly [TypeId]: TypeId
    /** @internal */
    makeFunctionComponent(runtimeRef: React.Ref<Runtime.Runtime<Exclude<R, Scope.Scope>>>, scope: Scope.Scope): React.FC<P>
    /** @internal */
    readonly body: (props: P) => Effect.Effect<React.ReactNode, E, R>
}

export namespace Component {
    export type Props<T> = T extends Component<infer P, infer _E, infer _R> ? P : never
    export type Error<T> = T extends Component<infer _P, infer E, infer _R> ? E : never
    export type Context<T> = T extends Component<infer _P, infer _E, infer R> ? R : never

    export interface Options {
        readonly displayName?: string
        readonly finalizerExecutionMode: "sync" | "fork"
        readonly finalizerExecutionStrategy: ExecutionStrategy.ExecutionStrategy
    }
}


const ComponentProto = Object.freeze({
    ...Effectable.CommitPrototype,
    [TypeId]: TypeId,

    commit: Effect.fn("Component")(function* <P extends {}, E, R>(this: Component<P, E, R>) {
        const self = this
        const runtimeRef = React.useRef<Runtime.Runtime<Exclude<R, Scope.Scope>>>(null!)
        runtimeRef.current = yield* Effect.runtime<Exclude<R, Scope.Scope>>()

        return React.useCallback(function ScopeProvider(props: P) {
            const scope = Runtime.runSync(runtimeRef.current)(Hook.useScope(
                Array.from(
                    Context.omit(...nonReactiveTags)(runtimeRef.current.context).unsafeMap.values()
                ),
                self,
            ))

            const FC = React.useMemo(() => {
                const f = self.makeFunctionComponent(runtimeRef, scope)
                f.displayName = self.displayName ?? "Anonymous"
                return Memoized.isMemoized(self)
                    ? React.memo(f, self.propsAreEqual)
                    : f
            }, [scope])

            return React.createElement(FC, props)
        }, [])
    }),

    makeFunctionComponent <P extends {}, E, R>(
        this: Component<P, E, R>,
        runtimeRef: React.RefObject<Runtime.Runtime<Exclude<R, Scope.Scope>>>,
        scope: Scope.Scope,
    ): React.FC<P> {
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


export const isComponent = (u: unknown): u is Component<{}, unknown, unknown> => Predicate.hasProperty(u, TypeId)

export namespace make {
    export type Gen = {
        <Eff extends Utils.YieldWrap<Effect.Effect<any, any, any>>, P extends {} = {}>(
            body: (props: P) => Generator<Eff, React.ReactNode, never>,
        ): Component<
            P,
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
            ) => B
        ): Component<P, Effect.Effect.Error<B>, Effect.Effect.Context<B>>
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
        ): Component<P, Effect.Effect.Error<C>, Effect.Effect.Context<C>>
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
        ): Component<P, Effect.Effect.Error<D>, Effect.Effect.Context<D>>
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
        ): Component<P, Effect.Effect.Error<E>, Effect.Effect.Context<E>>
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
        ): Component<P, Effect.Effect.Error<F>, Effect.Effect.Context<F>>
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
        ): Component<P, Effect.Effect.Error<G>, Effect.Effect.Context<G>>
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
        ): Component<P, Effect.Effect.Error<H>, Effect.Effect.Context<H>>
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
        ): Component<P, Effect.Effect.Error<I>, Effect.Effect.Context<I>>
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
        ): Component<P, Effect.Effect.Error<J>, Effect.Effect.Context<J>>
    }

    export type NonGen = {
        <Eff extends Effect.Effect<React.ReactNode, any, any>, P extends {} = {}>(
            body: (props: P) => Eff
        ): Component<P, Effect.Effect.Error<Eff>, Effect.Effect.Context<Eff>>
        <Eff extends Effect.Effect<React.ReactNode, any, any>, A, P extends {} = {}>(
            body: (props: P) => A,
            a: (_: A, props: NoInfer<P>) => Eff,
        ): Component<P, Effect.Effect.Error<Eff>, Effect.Effect.Context<Eff>>
        <Eff extends Effect.Effect<React.ReactNode, any, any>, A, B, P extends {} = {}>(
            body: (props: P) => A,
            a: (_: A, props: NoInfer<P>) => B,
            b: (_: B, props: NoInfer<P>) => Eff,
        ): Component<P, Effect.Effect.Error<Eff>, Effect.Effect.Context<Eff>>
        <Eff extends Effect.Effect<React.ReactNode, any, any>, A, B, C, P extends {} = {}>(
            body: (props: P) => A,
            a: (_: A, props: NoInfer<P>) => B,
            b: (_: B, props: NoInfer<P>) => C,
            c: (_: C, props: NoInfer<P>) => Eff,
        ): Component<P, Effect.Effect.Error<Eff>, Effect.Effect.Context<Eff>>
        <Eff extends Effect.Effect<React.ReactNode, any, any>, A, B, C, D, P extends {} = {}>(
            body: (props: P) => A,
            a: (_: A, props: NoInfer<P>) => B,
            b: (_: B, props: NoInfer<P>) => C,
            c: (_: C, props: NoInfer<P>) => D,
            d: (_: D, props: NoInfer<P>) => Eff,
        ): Component<P, Effect.Effect.Error<Eff>, Effect.Effect.Context<Eff>>
        <Eff extends Effect.Effect<React.ReactNode, any, any>, A, B, C, D, E, P extends {} = {}>(
            body: (props: P) => A,
            a: (_: A, props: NoInfer<P>) => B,
            b: (_: B, props: NoInfer<P>) => C,
            c: (_: C, props: NoInfer<P>) => D,
            d: (_: D, props: NoInfer<P>) => E,
            e: (_: E, props: NoInfer<P>) => Eff,
        ): Component<P, Effect.Effect.Error<Eff>, Effect.Effect.Context<Eff>>
        <Eff extends Effect.Effect<React.ReactNode, any, any>, A, B, C, D, E, F, P extends {} = {}>(
            body: (props: P) => A,
            a: (_: A, props: NoInfer<P>) => B,
            b: (_: B, props: NoInfer<P>) => C,
            c: (_: C, props: NoInfer<P>) => D,
            d: (_: D, props: NoInfer<P>) => E,
            e: (_: E, props: NoInfer<P>) => F,
            f: (_: F, props: NoInfer<P>) => Eff,
        ): Component<P, Effect.Effect.Error<Eff>, Effect.Effect.Context<Eff>>
        <Eff extends Effect.Effect<React.ReactNode, any, any>, A, B, C, D, E, F, G, P extends {} = {}>(
            body: (props: P) => A,
            a: (_: A, props: NoInfer<P>) => B,
            b: (_: B, props: NoInfer<P>) => C,
            c: (_: C, props: NoInfer<P>) => D,
            d: (_: D, props: NoInfer<P>) => E,
            e: (_: E, props: NoInfer<P>) => F,
            f: (_: F, props: NoInfer<P>) => G,
            g: (_: G, props: NoInfer<P>) => Eff,
        ): Component<P, Effect.Effect.Error<Eff>, Effect.Effect.Context<Eff>>
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
        ): Component<P, Effect.Effect.Error<Eff>, Effect.Effect.Context<Eff>>
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
        ): Component<P, Effect.Effect.Error<Eff>, Effect.Effect.Context<Eff>>
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
        const displayName = displayNameFromBody(spanNameOrBody)
        return Object.setPrototypeOf(
            Object.assign(function() {}, defaultOptions, {
                body: displayName
                    ? Effect.fn(displayName)(spanNameOrBody as any, ...pipeables as [])
                    : Effect.fn(spanNameOrBody as any, ...pipeables),
                displayName,
            }),
            ComponentProto,
        )
    }
    else {
        const spanOptions = pipeables[0]
        return (body: any, ...pipeables: any[]) => Object.setPrototypeOf(
            Object.assign(function() {}, defaultOptions, {
                body: Effect.fn(spanNameOrBody, spanOptions)(body, ...pipeables as []),
                displayName: displayNameFromBody(body) ?? spanNameOrBody,
            }),
            ComponentProto,
        )
    }
}

export const makeUntraced: make.Gen & make.NonGen = (
    body: Function,
    ...pipeables: any[]
) => Object.setPrototypeOf(
    Object.assign(function() {}, defaultOptions, {
        body: Effect.fnUntraced(body as any, ...pipeables as []),
        displayName: displayNameFromBody(body),
    }),
    ComponentProto,
)

const displayNameFromBody = (body: Function) => !String.isEmpty(body.name) ? body.name : undefined

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
    Object.assign(function() {}, self, options),
    Object.getPrototypeOf(self),
))

export const withRuntime: {
    <P extends {}, E, R>(
        context: React.Context<Runtime.Runtime<R>>,
    ): (self: Component<P, E, R>) => React.FC<P>
    <P extends {}, E, R>(
        self: Component<P, E, R>,
        context: React.Context<Runtime.Runtime<R>>,
    ): React.FC<P>
} = Function.dual(2, <P extends {}, E, R>(
    self: Component<P, E, R>,
    context: React.Context<Runtime.Runtime<R>>,
): React.FC<P> => function WithRuntime(props) {
    return React.createElement(
        Runtime.runSync(React.useContext(context))(self),
        props,
    )
})
