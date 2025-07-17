import { type Context, Effect, Equivalence, ExecutionStrategy, Exit, type Layer, Option, pipe, PubSub, Ref, Runtime, Scope, Stream, SubscriptionRef } from "effect"
import * as React from "react"
import { SetStateAction } from "./types/index.js"


export interface ScopeOptions {
    readonly finalizerExecutionMode?: "sync" | "fork"
    readonly finalizerExecutionStrategy?: ExecutionStrategy.ExecutionStrategy
}


export const useScope: {
    (
        deps: React.DependencyList,
        options?: ScopeOptions,
    ): Effect.Effect<Scope.Scope>
} = Effect.fn("useScope")(function*(deps, options) {
    const runtime = yield* Effect.runtime()

    const [isInitialRun, initialScope] = React.useMemo(() => Runtime.runSync(runtime)(Effect.all([
        Ref.make(true),
        Scope.make(options?.finalizerExecutionStrategy ?? ExecutionStrategy.sequential),
    ])), [])
    const [scope, setScope] = React.useState(initialScope)

    React.useEffect(() => Runtime.runSync(runtime)(
        Effect.if(isInitialRun, {
            onTrue: () => Effect.as(
                Ref.set(isInitialRun, false),
                () => closeScope(scope, runtime, options),
            ),

            onFalse: () => Scope.make(options?.finalizerExecutionStrategy ?? ExecutionStrategy.sequential).pipe(
                Effect.tap(scope => Effect.sync(() => setScope(scope))),
                Effect.map(scope => () => closeScope(scope, runtime, options)),
            ),
        })
    ), deps)

    return scope
})

const closeScope = (
    scope: Scope.CloseableScope,
    runtime: Runtime.Runtime<never>,
    options?: ScopeOptions,
) => {
    switch (options?.finalizerExecutionMode ?? "sync") {
        case "sync":
            Runtime.runSync(runtime)(Scope.close(scope, Exit.void))
            break
        case "fork":
            Runtime.runFork(runtime)(Scope.close(scope, Exit.void))
            break
    }
}


export const useCallbackSync: {
    <Args extends unknown[], A, E, R>(
        callback: (...args: Args) => Effect.Effect<A, E, R>,
        deps: React.DependencyList,
    ): Effect.Effect<(...args: Args) => A, never, R>
} = Effect.fn("useCallbackSync")(function* <Args extends unknown[], A, E, R>(
    callback: (...args: Args) => Effect.Effect<A, E, R>,
    deps: React.DependencyList,
) {
    const runtime = yield* Effect.runtime<R>()
    return React.useCallback((...args: Args) => Runtime.runSync(runtime)(callback(...args)), deps)
})

export const useCallbackPromise: {
    <Args extends unknown[], A, E, R>(
        callback: (...args: Args) => Effect.Effect<A, E, R>,
        deps: React.DependencyList,
    ): Effect.Effect<(...args: Args) => Promise<A>, never, R>
} = Effect.fn("useCallbackPromise")(function* <Args extends unknown[], A, E, R>(
    callback: (...args: Args) => Effect.Effect<A, E, R>,
    deps: React.DependencyList,
) {
    const runtime = yield* Effect.runtime<R>()
    return React.useCallback((...args: Args) => Runtime.runPromise(runtime)(callback(...args)), deps)
})


export const useMemo: {
    <A, E, R>(
        factory: () => Effect.Effect<A, E, R>,
        deps: React.DependencyList,
    ): Effect.Effect<A, E, R>
} = Effect.fn("useMemo")(function* <A, E, R>(
    factory: () => Effect.Effect<A, E, R>,
    deps: React.DependencyList,
) {
    const runtime = yield* Effect.runtime()
    return yield* React.useMemo(() => Runtime.runSync(runtime)(Effect.cached(factory())), deps)
})

export const useOnce: {
    <A, E, R>(factory: () => Effect.Effect<A, E, R>): Effect.Effect<A, E, R>
} = Effect.fn("useOnce")(function* <A, E, R>(
    factory: () => Effect.Effect<A, E, R>
) {
    return yield* useMemo(factory, [])
})


export const useEffect: {
    <E, R>(
        effect: () => Effect.Effect<void, E, R>,
        deps?: React.DependencyList,
        options?: ScopeOptions,
    ): Effect.Effect<void, never, Exclude<R, Scope.Scope>>
} = Effect.fn("useEffect")(function* <E, R>(
    effect: () => Effect.Effect<void, E, R>,
    deps?: React.DependencyList,
    options?: ScopeOptions,
) {
    const runtime = yield* Effect.runtime<Exclude<R, Scope.Scope>>()

    React.useEffect(() => Effect.Do.pipe(
        Effect.bind("scope", () => Scope.make(options?.finalizerExecutionStrategy ?? ExecutionStrategy.sequential)),
        Effect.bind("exit", ({ scope }) => Effect.exit(Effect.provideService(effect(), Scope.Scope, scope))),
        Effect.map(({ scope }) =>
            () => closeScope(scope, runtime, options)
        ),
        Runtime.runSync(runtime),
    ), deps)
})

export const useLayoutEffect: {
    <E, R>(
        effect: () => Effect.Effect<void, E, R>,
        deps?: React.DependencyList,
        options?: ScopeOptions,
    ): Effect.Effect<void, never, Exclude<R, Scope.Scope>>
} = Effect.fn("useLayoutEffect")(function* <E, R>(
    effect: () => Effect.Effect<void, E, R>,
    deps?: React.DependencyList,
    options?: ScopeOptions,
) {
    const runtime = yield* Effect.runtime<Exclude<R, Scope.Scope>>()

    React.useLayoutEffect(() => Effect.Do.pipe(
        Effect.bind("scope", () => Scope.make(options?.finalizerExecutionStrategy ?? ExecutionStrategy.sequential)),
        Effect.bind("exit", ({ scope }) => Effect.exit(Effect.provideService(effect(), Scope.Scope, scope))),
        Effect.map(({ scope }) =>
            () => closeScope(scope, runtime, options)
        ),
        Runtime.runSync(runtime),
    ), deps)
})

export const useFork: {
    <E, R>(
        effect: () => Effect.Effect<void, E, R>,
        deps?: React.DependencyList,
        options?: Runtime.RunForkOptions & ScopeOptions,
    ): Effect.Effect<void, never, Exclude<R, Scope.Scope>>
} = Effect.fn("useFork")(function* <E, R>(
    effect: () => Effect.Effect<void, E, R>,
    deps?: React.DependencyList,
    options?: Runtime.RunForkOptions & ScopeOptions,
) {
    const runtime = yield* Effect.runtime<Exclude<R, Scope.Scope>>()

    React.useEffect(() => {
        const scope = Runtime.runSync(runtime)(options?.scope
            ? Scope.fork(options.scope, options?.finalizerExecutionStrategy ?? ExecutionStrategy.sequential)
            : Scope.make(options?.finalizerExecutionStrategy ?? ExecutionStrategy.sequential)
        )
        Runtime.runFork(runtime)(Effect.provideService(effect(), Scope.Scope, scope), { ...options, scope })
        return () => closeScope(scope, runtime, {
            ...options,
            finalizerExecutionMode: options?.finalizerExecutionMode ?? "fork",
        })
    }, deps)
})


export const useContext: {
    <ROut, E, RIn>(
        layer: Layer.Layer<ROut, E, RIn>,
        options?: ScopeOptions,
    ): Effect.Effect<Context.Context<ROut>, E, Exclude<RIn, Scope.Scope>>
} = Effect.fn("useContext")(function* <ROut, E, RIn>(
    layer: Layer.Layer<ROut, E, RIn>,
    options?: ScopeOptions,
) {
    const scope = yield* useScope([layer], options)

    return yield* useMemo(() => Effect.provideService(
        Effect.provide(Effect.context<ROut>(), layer),
        Scope.Scope,
        scope,
    ), [scope])
})


export const useRefFromReactiveValue: {
    <A>(value: A): Effect.Effect<SubscriptionRef.SubscriptionRef<A>>
} = Effect.fn("useRefFromReactiveValue")(function*(value) {
    const ref = yield* useOnce(() => SubscriptionRef.make(value))
    yield* useEffect(() => Ref.set(ref, value), [value])
    return ref
})

export const useSubscribeRefs: {
    <const Refs extends readonly SubscriptionRef.SubscriptionRef<any>[]>(
        ...refs: Refs
    ): Effect.Effect<{ [K in keyof Refs]: Effect.Effect.Success<Refs[K]> }>
} = Effect.fn("useSubscribeRefs")(function* <const Refs extends readonly SubscriptionRef.SubscriptionRef<any>[]>(
    ...refs: Refs
) {
    const [reactStateValue, setReactStateValue] = React.useState(yield* useOnce(() =>
        Effect.all(refs as readonly SubscriptionRef.SubscriptionRef<any>[])
    ))

    yield* useFork(() => pipe(
        refs.map(ref => Stream.changesWith(ref.changes, Equivalence.strict())),
        streams => Stream.zipLatestAll(...streams),
        Stream.runForEach(v =>
            Effect.sync(() => setReactStateValue(v))
        ),
    ), refs)

    return reactStateValue as any
})

export const useRefState: {
    <A>(
        ref: SubscriptionRef.SubscriptionRef<A>
    ): Effect.Effect<readonly [A, React.Dispatch<React.SetStateAction<A>>]>
} = Effect.fn("useRefState")(function* <A>(ref: SubscriptionRef.SubscriptionRef<A>) {
    const [reactStateValue, setReactStateValue] = React.useState(yield* useOnce(() => ref))

    yield* useFork(() => Stream.runForEach(
        Stream.changesWith(ref.changes, Equivalence.strict()),
        v => Effect.sync(() => setReactStateValue(v)),
    ), [ref])

    const setValue = yield* useCallbackSync((setStateAction: React.SetStateAction<A>) =>
        Ref.update(ref, prevState =>
            SetStateAction.value(setStateAction, prevState)
        ),
    [ref])

    return [reactStateValue, setValue]
})


export const useStreamFromReactiveValues: {
    <const A extends React.DependencyList>(
        values: A
    ): Effect.Effect<Stream.Stream<A>, never, Scope.Scope>
} = Effect.fn("useStreamFromReactiveValues")(function* <const A extends React.DependencyList>(values: A) {
    const { latest, pubsub, stream } = yield* useOnce(() => Effect.Do.pipe(
        Effect.bind("latest", () => Ref.make(values)),
        Effect.bind("pubsub", () => Effect.acquireRelease(PubSub.unbounded<A>(), PubSub.shutdown)),
        Effect.let("stream", ({ latest, pubsub }) => latest.pipe(
            Effect.flatMap(a => Effect.map(
                Stream.fromPubSub(pubsub, { scoped: true }),
                s => Stream.concat(Stream.make(a), s),
            )),
            Stream.unwrapScoped,
        )),
    ))

    yield* useEffect(() => Ref.set(latest, values).pipe(
        Effect.andThen(PubSub.publish(pubsub, values)),
        Effect.unlessEffect(PubSub.isShutdown(pubsub)),
    ), values)

    return stream
})

export const useSubscribeStream: {
    <A, E, R>(
        stream: Stream.Stream<A, E, R>
    ): Effect.Effect<Option.Option<A>, never, R>
    <A extends NonNullable<unknown>, E, R>(
        stream: Stream.Stream<A, E, R>,
        initialValue: A,
    ): Effect.Effect<Option.Some<A>, never, R>
} = Effect.fn("useSubscribeStream")(function* <A extends NonNullable<unknown>, E, R>(
    stream: Stream.Stream<A, E, R>,
    initialValue?: A,
) {
    const [reactStateValue, setReactStateValue] = React.useState(
        React.useMemo(() => initialValue
            ? Option.some(initialValue)
            : Option.none(),
        [])
    )

    yield* useFork(() => Stream.runForEach(
        Stream.changesWith(stream, Equivalence.strict()),
        v => Effect.sync(() => setReactStateValue(Option.some(v))),
    ), [stream])

    return reactStateValue as Option.Some<A>
})
