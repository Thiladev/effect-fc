import { R } from "@/reffuse"
import { createFileRoute } from "@tanstack/react-router"
import { Console, DateTime, Effect, Ref, Schedule, Stream, SubscriptionRef } from "effect"


const timeEverySecond = Stream.repeatEffectWithSchedule(
    DateTime.now,
    Schedule.intersect(Schedule.forever, Schedule.spaced("1 second")),
)


export const Route = createFileRoute("/time")({
    component: Time
})

function Time() {

    const timeRef = R.useMemo(() => DateTime.now.pipe(Effect.flatMap(SubscriptionRef.make)), [])

    R.useFork(() => Effect.addFinalizer(() => Console.log("Cleanup")).pipe(
        Effect.andThen(Stream.runForEach(timeEverySecond, v => Ref.set(timeRef, v)))
    ), [timeRef])

    const [time] = R.useRefState(timeRef)


    return (
        <div className="container mx-auto">
            <p className="text-center">
                {DateTime.format(time, {
                    hour: "numeric",
                    minute: "numeric",
                    second: "numeric",
                })}
            </p>
        </div>
    )

}
