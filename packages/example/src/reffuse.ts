import { HttpClient } from "@effect/platform"
import { Clipboard, Geolocation, Permissions } from "@effect/platform-browser"
import { LazyRefExtension } from "@reffuse/extension-lazyref"
import { QueryExtension } from "@reffuse/extension-query"
import { Reffuse, ReffuseContext } from "reffuse"
import { AppQueryClient, AppQueryErrorHandler } from "./services"


export const RootContext = ReffuseContext.make<
    | AppQueryClient.AppQueryClient
    | AppQueryErrorHandler.AppQueryErrorHandler
    | Clipboard.Clipboard
    | Geolocation.Geolocation
    | Permissions.Permissions
    | HttpClient.HttpClient
>()

export class RootReffuse extends Reffuse.Reffuse.pipe(
    Reffuse.withExtension(LazyRefExtension),
    Reffuse.withExtension(QueryExtension),
    Reffuse.withContexts(RootContext),
) {}

export const R = new RootReffuse()
