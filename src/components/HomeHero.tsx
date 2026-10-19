import * as React from "react"
import SculptureHero, { type SculptureHeroProps } from "./ui/liquid-sculpture-hero"
import { tenure } from "../lib/duration"

interface Props extends SculptureHeroProps {
  /** The body as written at build time, with today's tenure filled in. */
  body: string
  /** The same copy with a {duration} placeholder, and the start date to fill it from. */
  bodyTemplate: string
  since: string
}

const readTheme = (): "light" | "dark" =>
  document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light"

// The vendored hero keeps its own light/dark state. This drives it from the
// site's switch instead, and keeps the tenure current between deploys the way
// Duration.astro does for the rest of the page. Both change only after
// hydration, so the server-rendered markup always matches the first render.
export default function HomeHero({ body: builtBody, bodyTemplate, since, className, ...props }: Props) {
  const [theme, setTheme] = React.useState<"light" | "dark">("light")
  const [live, setLive] = React.useState(false)
  const [body, setBody] = React.useState(builtBody)

  React.useEffect(() => {
    setTheme(readTheme())
    setLive(true)
    setBody(bodyTemplate.replace("{duration}", tenure(since, "long")))

    const observer = new MutationObserver(() => setTheme(readTheme()))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] })
    return () => observer.disconnect()
  }, [bodyTemplate, since])

  return (
    <SculptureHero
      {...props}
      body={body}
      theme={theme}
      className={[className, live && "is-live"].filter(Boolean).join(" ")}
    />
  )
}
