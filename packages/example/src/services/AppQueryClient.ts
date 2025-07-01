import { QueryClient } from "@reffuse/extension-query"
import * as AppQueryErrorHandler from "./AppQueryErrorHandler"


export class AppQueryClient extends QueryClient.Service<AppQueryClient>()({
    errorHandler: AppQueryErrorHandler.AppQueryErrorHandler
}) {}
