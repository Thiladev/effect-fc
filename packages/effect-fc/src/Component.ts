/** biome-ignore-all lint/complexity/noBannedTypes: {} is the default type for React props */
/** biome-ignore-all lint/complexity/useArrowFunction: necessary for class prototypes */
import { Context, type Duration, Effect, Effectable, Equivalence, ExecutionStrategy, Exit, Fiber, Function, HashMap, Layer, ManagedRuntime, Option, Predicate, Ref, Runtime, Scope, Stream, Tracer, type Utils } from "effect"
import * as React from "react"
import { Memoized } from "./index.js"
import * as Result from "./Result.js"


export const TypeId: unique symbol = Symbol.for("@effect-fc/Component/Component")
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
        runtimeRef: React.Ref<Runtime.Runtime<Exclude<R, Scope.Scope>>>
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
        readonly finalizerExecutionStrategy: ExecutionStrategy.ExecutionStrategy
        readonly finalizerExecutionDebounce: Duration.DurationInput
    }
}


const ComponentProto = Object.freeze({
    ...Effectable.CommitPrototype,
    [TypeId]: TypeId,

    commit: Effect.fnUntraced(function* <P extends {}, A extends React.ReactNode, E, R>(
        this: Component<P, A, E, R>
    ) {
        // biome-ignore lint/style/noNonNullAssertion: React ref initialization
        const runtimeRef = React.useRef<Runtime.Runtime<Exclude<R, Scope.Scope>>>(null!)
        runtimeRef.current = yield* Effect.runtime<Exclude<R, Scope.Scope>>()

        return yield* React.useState(() => Runtime.runSync(runtimeRef.current)(Effect.cachedFunction(
            (_services: readonly any[]) => Effect.sync(() => {
                const f: React.FC<P> = this.makeFunctionComponent(runtimeRef)
                f.displayName = this.displayName ?? "Anonymous"
                return Memoized.isMemoized(this)
                    ? React.memo(f, this.propsAreEqual)
                    : f
            }),
            Equivalence.array(Equivalence.strict()),
        )))[0](Array.from(
            Context.omit(...nonReactiveTags)(runtimeRef.current.context).unsafeMap.values()
        ))
    }),

    makeFunctionComponent<P extends {}, A extends React.ReactNode, E, R>(
        this: Component<P, A, E, R>,
        runtimeRef: React.RefObject<Runtime.Runtime<Exclude<R, Scope.Scope>>>,
    ) {
        return (props: P) => Runtime.runSync(runtimeRef.current)(
            Effect.andThen(
                useScope([], this),
                scope => Effect.provideService(this.body(props), Scope.Scope, scope),
            )
        )
    },
} as const)

const defaultOptions: Component.Options = {
    finalizerExecutionStrategy: ExecutionStrategy.sequential,
    finalizerExecutionDebounce: "100 millis",
}

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
    ): (self: Component<P, A, E, Scope.Scope | NoInfer<R>>) => (props: P) => A
    <P extends {}, A extends React.ReactNode, E, R>(
        self: Component<P, A, E, Scope.Scope | NoInfer<R>>,
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


export class ScopeMap extends Effect.Service<ScopeMap>()("@effect-fc/Component/ScopeMap", {
    effect: Effect.bind(Effect.Do, "ref", () => Ref.make(HashMap.empty<object, ScopeMap.Entry>()))
}) {}

export namespace ScopeMap {
    export interface Entry {
        readonly scope: Scope.CloseableScope
        readonly closeFiber: Option.Option<Fiber.RuntimeFiber<void>>
    }
}


export namespace useScope {
    export interface Options {
        readonly finalizerExecutionStrategy?: ExecutionStrategy.ExecutionStrategy
        readonly finalizerExecutionDebounce?: Duration.DurationInput
    }
}

export const useScope: {
    (
        deps: React.DependencyList,
        options?: useScope.Options,
    ): Effect.Effect<Scope.Scope>
} = Effect.fnUntraced(function*(deps, options) {
    // biome-ignore lint/style/noNonNullAssertion: context initialization
    const runtimeRef = React.useRef<Runtime.Runtime<never>>(null!)
    runtimeRef.current = yield* Effect.runtime()

    const scopeMap = yield* ScopeMap as unknown as Effect.Effect<ScopeMap>

    const [key, scope] = React.useMemo(() => Runtime.runSync(runtimeRef.current)(Effect.andThen(
        Effect.all([Effect.succeed({}), scopeMap.ref]),
        ([key, map]) => Effect.andThen(
            Option.match(HashMap.get(map, key), {
                onSome: entry => Effect.succeed(entry.scope),
                onNone: () => Effect.tap(
                    Scope.make(options?.finalizerExecutionStrategy ?? defaultOptions.finalizerExecutionStrategy),
                    scope => Ref.update(scopeMap.ref, HashMap.set(key, {
                        scope,
                        closeFiber: Option.none(),
                    })),
                ),
            }),
            scope => [key, scope] as const,
        ),
    // biome-ignore lint/correctness/useExhaustiveDependencies: use of React.DependencyList
    )), deps)

    // biome-ignore lint/correctness/useExhaustiveDependencies: only reactive on "key"
    React.useEffect(() => Runtime.runSync(runtimeRef.current)(scopeMap.ref.pipe(
        Effect.andThen(HashMap.get(key)),
        Effect.tap(entry => Option.match(entry.closeFiber, {
            onSome: fiber => Effect.andThen(
                Ref.update(scopeMap.ref, HashMap.set(key, { ...entry, closeFiber: Option.none() })),
                Fiber.interruptFork(fiber),
            ),
            onNone: () => Effect.void,
        })),
        Effect.map(({ scope }) =>
            () => Runtime.runSync(runtimeRef.current)(Effect.andThen(
                Effect.forkDaemon(Effect.sleep(options?.finalizerExecutionDebounce ?? defaultOptions.finalizerExecutionDebounce).pipe(
                    Effect.andThen(Scope.close(scope, Exit.void)),
                    Effect.andThen(Ref.update(scopeMap.ref, HashMap.remove(key))),
                )),
                fiber => Ref.update(scopeMap.ref, HashMap.set(key, {
                    scope,
                    closeFiber: Option.some(fiber),
                })),
            ))
        ),
    )), [key])

    return scope
})

export const useOnMount: {
    <A, E, R>(
        f: () => Effect.Effect<A, E, R>
    ): Effect.Effect<A, E, R>
} = Effect.fnUntraced(function* <A, E, R>(
    f: () => Effect.Effect<A, E, R>
) {
    const runtime = yield* Effect.runtime<R>()
    return yield* React.useState(() => Runtime.runSync(runtime)(Effect.cached(f())))[0]
})

export namespace useOnChange {
    export type Options = useScope.Options
}

export const useOnChange: {
    <A, E, R>(
        f: () => Effect.Effect<A, E, R>,
        deps: React.DependencyList,
        options?: useOnChange.Options,
    ): Effect.Effect<A, E, Exclude<R, Scope.Scope>>
} = Effect.fnUntraced(function* <A, E, R>(
    f: () => Effect.Effect<A, E, R>,
    deps: React.DependencyList,
    options?: useOnChange.Options,
) {
    const runtime = yield* Effect.runtime<Exclude<R, Scope.Scope>>()
    const scope = yield* useScope(deps, options)

    // biome-ignore lint/correctness/useExhaustiveDependencies: only reactive on "scope"
    return yield* React.useMemo(() => Runtime.runSync(runtime)(
        Effect.cached(Effect.provideService(f(), Scope.Scope, scope))
    ), [scope])
})

export namespace useOnMountResult {
    export interface Options<A, E, P> extends Result.forkEffectScoped.Options<P> {
        readonly equivalence?: Equivalence.Equivalence<Result.Result<A, E, P>>
    }
}

export const useOnMountResult: {
    <A, E, R, P = never>(
        f: () => Effect.Effect<A, E, Result.forkEffectScoped.InputContext<R, NoInfer<P>>>,
        options?: useOnChangeResult.Options<A, E, P>,
    ): Effect.Effect<Result.Result<A, E, P>, never, Result.forkEffectScoped.OutputContext<R>>
} = Effect.fnUntraced(function* <A, E, R, P = never>(
    f: () => Effect.Effect<A, E, Result.forkEffectScoped.InputContext<R, NoInfer<P>>>,
    options?: useOnChangeResult.Options<A, E, P>,
) {
    const [result, setResult] = React.useState(() => Result.initial() as Result.Result<A, E, P>)

    yield* useOnMount(() => Result.forkEffectScoped(f(), options).pipe(
        Effect.andThen(Stream.fromQueue),
        Stream.unwrap,
        Stream.changesWith(options?.equivalence ?? Equivalence.strict()),
        Stream.runForEach(result => Effect.sync(() => setResult(result))),
    ))

    return result
})

export namespace useOnChangeResult {
    export interface Options<A, E, P>
    extends useOnMountResult.Options<A, E, P>, useReactEffect.Options {}
}

export const useOnChangeResult: {
    <A, E, R, P = never>(
        f: () => Effect.Effect<A, E, Result.forkEffectScoped.InputContext<R, NoInfer<P>>>,
        deps?: React.DependencyList,
        options?: useOnChangeResult.Options<A, E, P>,
    ): Effect.Effect<
        Result.Result<A, E, P>,
        never,
        Exclude<Result.forkEffectScoped.OutputContext<R>, Scope.Scope>
    >
} = Effect.fnUntraced(function* <A, E, R, P = never>(
    f: () => Effect.Effect<A, E, Result.forkEffectScoped.InputContext<R, NoInfer<P>>>,
    deps?: React.DependencyList,
    options?: useOnChangeResult.Options<A, E, P>,
) {
    const [result, setResult] = React.useState(() => Result.initial() as Result.Result<A, E, P>)

    yield* useReactEffect(() => Result.forkEffectScoped(f(), options).pipe(
        Effect.andThen(Stream.fromQueue),
        Stream.unwrap,
        Stream.changesWith(options?.equivalence ?? Equivalence.strict()),
        Stream.runForEach(result => Effect.sync(() => setResult(result))),
    ), deps, options)

    return result
})

export namespace useReactEffect {
    export interface Options {
        readonly finalizerExecutionMode?: "sync" | "fork"
        readonly finalizerExecutionStrategy?: ExecutionStrategy.ExecutionStrategy
    }
}

export const useReactEffect: {
    <E, R>(
        f: () => Effect.Effect<void, E, R>,
        deps?: React.DependencyList,
        options?: useReactEffect.Options,
    ): Effect.Effect<void, never, Exclude<R, Scope.Scope>>
} = Effect.fnUntraced(function* <E, R>(
    f: () => Effect.Effect<void, E, R>,
    deps?: React.DependencyList,
    options?: useReactEffect.Options,
) {
    const runtime = yield* Effect.runtime<Exclude<R, Scope.Scope>>()
    // biome-ignore lint/correctness/useExhaustiveDependencies: use of React.DependencyList
    React.useEffect(() => runReactEffect(runtime, f, options), deps)
})

const runReactEffect = <E, R>(
    runtime: Runtime.Runtime<Exclude<R, Scope.Scope>>,
    f: () => Effect.Effect<void, E, R>,
    options?: useReactEffect.Options,
) => Effect.Do.pipe(
    Effect.bind("scope", () => Scope.make(options?.finalizerExecutionStrategy ?? defaultOptions.finalizerExecutionStrategy)),
    Effect.bind("exit", ({ scope }) => Effect.exit(Effect.provideService(f(), Scope.Scope, scope))),
    Effect.map(({ scope }) =>
        () => {
            switch (options?.finalizerExecutionMode ?? "fork") {
                case "sync":
                    Runtime.runSync(runtime)(Scope.close(scope, Exit.void))
                    break
                case "fork":
                    Runtime.runFork(runtime)(Scope.close(scope, Exit.void))
                    break
            }
        }
    ),
    Runtime.runSync(runtime),
)

export namespace useReactLayoutEffect {
    export type Options = useReactEffect.Options
}

export const useReactLayoutEffect: {
    <E, R>(
        f: () => Effect.Effect<void, E, R>,
        deps?: React.DependencyList,
        options?: useReactLayoutEffect.Options,
    ): Effect.Effect<void, never, Exclude<R, Scope.Scope>>
} = Effect.fnUntraced(function* <E, R>(
    f: () => Effect.Effect<void, E, R>,
    deps?: React.DependencyList,
    options?: useReactLayoutEffect.Options,
) {
    const runtime = yield* Effect.runtime<Exclude<R, Scope.Scope>>()
    // biome-ignore lint/correctness/useExhaustiveDependencies: use of React.DependencyList
    React.useLayoutEffect(() => runReactEffect(runtime, f, options), deps)
})

export const useCallbackSync: {
    <Args extends unknown[], A, E, R>(
        f: (...args: Args) => Effect.Effect<A, E, R>,
        deps: React.DependencyList,
    ): Effect.Effect<(...args: Args) => A, never, R>
} = Effect.fnUntraced(function* <Args extends unknown[], A, E, R>(
    f: (...args: Args) => Effect.Effect<A, E, R>,
    deps: React.DependencyList,
) {
    // biome-ignore lint/style/noNonNullAssertion: context initialization
    const runtimeRef = React.useRef<Runtime.Runtime<R>>(null!)
    runtimeRef.current = yield* Effect.runtime<R>()

    // biome-ignore lint/correctness/useExhaustiveDependencies: use of React.DependencyList
    return React.useCallback((...args: Args) => Runtime.runSync(runtimeRef.current)(f(...args)), deps)
})

export const useCallbackPromise: {
    <Args extends unknown[], A, E, R>(
        f: (...args: Args) => Effect.Effect<A, E, R>,
        deps: React.DependencyList,
    ): Effect.Effect<(...args: Args) => Promise<A>, never, R>
} = Effect.fnUntraced(function* <Args extends unknown[], A, E, R>(
    f: (...args: Args) => Effect.Effect<A, E, R>,
    deps: React.DependencyList,
) {
    // biome-ignore lint/style/noNonNullAssertion: context initialization
    const runtimeRef = React.useRef<Runtime.Runtime<R>>(null!)
    runtimeRef.current = yield* Effect.runtime<R>()

    // biome-ignore lint/correctness/useExhaustiveDependencies: use of React.DependencyList
    return React.useCallback((...args: Args) => Runtime.runPromise(runtimeRef.current)(f(...args)), deps)
})

export namespace useContext {
    export type Options = useOnChange.Options
}

export const useContext = <ROut, E, RIn>(
    layer: Layer.Layer<ROut, E, RIn>,
    options?: useContext.Options,
): Effect.Effect<Context.Context<ROut>, E, RIn> => useOnChange(() => Effect.context<RIn>().pipe(
    Effect.map(context => ManagedRuntime.make(Layer.provide(layer, Layer.succeedContext(context)))),
    Effect.tap(runtime => Effect.addFinalizer(() => runtime.disposeEffect)),
    Effect.andThen(runtime => runtime.runtimeEffect),
    Effect.andThen(runtime => runtime.context),
), [layer], options)
