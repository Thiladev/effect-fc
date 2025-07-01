import { HttpClientError } from "@effect/platform"
import { QueryErrorHandler } from "@reffuse/extension-query"
import { Effect } from "effect"


export class AppQueryErrorHandler extends Effect.Service<AppQueryErrorHandler>()("AppQueryErrorHandler", {
    effect: QueryErrorHandler.make<HttpClientError.HttpClientError>()(
        (self, failure, defect) => self.pipe(
            Effect.catchTag("RequestError", "ResponseError", failure),
            Effect.catchAllDefect(defect),
        )
    )
}) {}
