import { FetchHttpClient } from "@effect/platform"
import { Clipboard, Geolocation, Permissions } from "@effect/platform-browser"
import { Layer } from "effect"
import { ReactManagedRuntime } from "effect-fc"


export const AppLive = Layer.empty.pipe(
    Layer.provideMerge(Clipboard.layer),
    Layer.provideMerge(Geolocation.layer),
    Layer.provideMerge(Permissions.layer),
    Layer.provideMerge(FetchHttpClient.layer),
)

export const runtime = ReactManagedRuntime.make(AppLive)
