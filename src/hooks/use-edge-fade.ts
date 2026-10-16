"use client"

import * as React from "react"

const EDGE_FADE = 24

/**
 * Tracks horizontal overflow of a scroll container so the clipped edge fades
 * out — the cue that more content (columns, tabs) exists off-screen. Spread
 * `style` on the scroll container and pass `attach` as its `ref`.
 */
export function useEdgeFade<T extends HTMLElement = HTMLDivElement>() {
  // Callback ref (element in state) so render never reads a ref object.
  const [element, setElement] = React.useState<T | null>(null)
  const [edges, setEdges] = React.useState<{ start: boolean; end: boolean }>({
    start: false,
    end: false,
  })

  React.useEffect(() => {
    const el = element
    if (!el) return
    const update = () => {
      const overflowing = el.scrollWidth > el.clientWidth + 1
      const start = overflowing && el.scrollLeft > 0
      const end = overflowing && el.scrollLeft + el.clientWidth < el.scrollWidth - 1
      setEdges((prev) => (prev.start === start && prev.end === end ? prev : { start, end }))
    }
    update()
    el.addEventListener("scroll", update, { passive: true })
    // Absent in jsdom and very old browsers: the fade then only tracks scroll.
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update)
    ro?.observe(el)
    if (el.firstElementChild) ro?.observe(el.firstElementChild)
    return () => {
      el.removeEventListener("scroll", update)
      ro?.disconnect()
    }
  }, [element])

  const mask =
    edges.start && edges.end
      ? `linear-gradient(to right, transparent, black ${EDGE_FADE}px, black calc(100% - ${EDGE_FADE}px), transparent)`
      : edges.end
        ? `linear-gradient(to right, black calc(100% - ${EDGE_FADE}px), transparent)`
        : edges.start
          ? `linear-gradient(to right, transparent, black ${EDGE_FADE}px)`
          : undefined

  return {
    attach: setElement,
    element,
    edges,
    style: mask ? { maskImage: mask, WebkitMaskImage: mask } : undefined,
  }
}
