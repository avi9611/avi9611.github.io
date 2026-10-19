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

const watchTheme = (onChange: () => void) => {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] })
  return () => observer.disconnect()
}

// The vendored hero keeps its own light/dark state. This drives it from the
// site's switch instead, and keeps the tenure current between deploys the way
// Duration.astro does for the rest of the page. The server renders the light
// theme and React moves to the visitor's as it hydrates, before the hero picks
// its sculpture, so the light one is never fetched on a dark page.
export default function HomeHero({ body: builtBody, bodyTemplate, since, style, ...props }: Props) {
  const theme = React.useSyncExternalStore(watchTheme, readTheme, () => "light" as const)
  const [body, setBody] = React.useState(builtBody)

  React.useEffect(() => {
    setBody(bodyTemplate.replace("{duration}", tenure(since, "long")))
  }, [bodyTemplate, since])

  return (
    <SculptureHero
      {...props}
      body={body}
      theme={theme}
      // The page's own background, so the hero is right from the first paint in
      // either theme. The hex props still drive the sculpture's shader.
      style={{ "--sh-bg": "var(--bg)", ...style } as React.CSSProperties}
    />
  )
}
