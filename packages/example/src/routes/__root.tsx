import { VQueryErrorHandler } from "@/VQueryErrorHandler"
import { Container, Flex, Theme } from "@radix-ui/themes"
import { createRootRoute, Link, Outlet } from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools"

import "@radix-ui/themes/styles.css"
import "../index.css"


export const Route = createRootRoute({
    component: Root
})

function Root() {
    return (
        <Theme>
            <Container>
                <Flex direction="row" justify="center" align="center" gap="2">
                    <Link to="/">Index</Link>
                    <Link to="/time">Time</Link>
                    <Link to="/count">Count</Link>
                    <Link to="/tests">Tests</Link>
                    <Link to="/promise">Promise</Link>
                    <Link to="/query/usequery">Query</Link>
                    <Link to="/blank">Blank</Link>
                </Flex>
            </Container>

            <Outlet />

            <VQueryErrorHandler />
            <TanStackRouterDevtools />
        </Theme>
    )
}
