import { Todo } from "@/domain"
import { KeyValueStore } from "@effect/platform"
import { BrowserKeyValueStore } from "@effect/platform-browser"
import { Chunk, Console, Effect, Option, Schema, Stream, SubscriptionRef } from "effect"
import { SubscriptionSubRef } from "effect-fc/types"


export class TodosState extends Effect.Service<TodosState>()("TodosState", {
    effect: Effect.fn("TodosState")(function*(key: string) {
        const kv = yield* KeyValueStore.KeyValueStore

        const readFromLocalStorage = Console.log("Reading todos from local storage...").pipe(
            Effect.andThen(kv.get(key)),
            Effect.andThen(Option.match({
                onSome: Schema.decode(
                    Schema.parseJson(Schema.Chunk(Todo.TodoFromJson))
                ),
                onNone: () => Effect.succeed(Chunk.empty()),
            }))
        )

        const saveToLocalStorage = (todos: Chunk.Chunk<Todo.Todo>) => Effect.andThen(
            Console.log("Saving todos to local storage..."),
            Chunk.isNonEmpty(todos)
                ? Effect.andThen(
                    Schema.encode(
                        Schema.parseJson(Schema.Chunk(Todo.TodoFromJson))
                    )(todos),
                    v => kv.set(key, v),
                )
                : kv.remove(key)
        )

        const ref = yield* SubscriptionRef.make(yield* readFromLocalStorage)
        const sizeRef = SubscriptionSubRef.makeFromPath(ref, ["length"])

        yield* Effect.forkScoped(ref.changes.pipe(
            Stream.debounce("500 millis"),
            Stream.runForEach(saveToLocalStorage),
        ))
        yield* Effect.addFinalizer(() => ref.pipe(
            Effect.andThen(saveToLocalStorage),
            Effect.ignore,
        ))

        return { ref, sizeRef } as const
    }),

    dependencies: [BrowserKeyValueStore.layerLocalStorage],
}) {}
