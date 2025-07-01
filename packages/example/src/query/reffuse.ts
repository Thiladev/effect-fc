import { RootReffuse } from "@/reffuse"
import { Reffuse, ReffuseContext } from "reffuse"
import { Uuid4Query } from "./services"


export const QueryContext = ReffuseContext.make<Uuid4Query.Uuid4Query>()

export const R = new class QueryReffuse extends RootReffuse.pipe(
    Reffuse.withContexts(QueryContext)
) {}
