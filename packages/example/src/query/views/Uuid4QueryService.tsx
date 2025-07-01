import { Button, Container, Flex, Text } from "@radix-ui/themes"
import * as AsyncData from "@typed/async-data"
import { R } from "../reffuse"
import { Uuid4Query } from "../services"


export function Uuid4QueryService() {
    const runFork = R.useRunFork()

    const query = R.useMemo(() => Uuid4Query.Uuid4Query, [])
    const [state] = R.useSubscribeRefs(query.stateRef)


    return (
        <Container>
            <Flex direction="column" align="center" gap="2">
                <Text>
                    {AsyncData.match(state, {
                        NoData: () => "No data yet",
                        Loading: () => "Loading...",
                        Success: (value, { isRefreshing, isOptimistic }) =>
                            `Value: ${value} ${isRefreshing ? "(refreshing)" : ""} ${isOptimistic ? "(optimistic)" : ""}`,
                        Failure: (cause, { isRefreshing }) =>
                            `Error: ${cause} ${isRefreshing ? "(refreshing)" : ""}`,
                    })}
                </Text>

                <Button onClick={() => runFork(query.forkRefresh)}>Refresh</Button>
            </Flex>
        </Container>
    )
}
