'use client'

import * as React from "react"
import { Slot as OriginalSlot } from "@radix-ui/react-slot"

type SlotProps = React.ComponentProps<typeof OriginalSlot>

const debugSlots = process.env.NEXT_PUBLIC_DEBUG_SLOTS === 'true'

function getElementTypeName(element: React.ReactElement): string {
  if (typeof element.type === "string") {
    return element.type
  }

  if (typeof element.type === "function") {
    const component = element.type as React.ComponentType<unknown>
    return component.displayName ?? component.name ?? "anonymous"
  }

  if (typeof element.type === "object" && element.type !== null) {
    const typeObject = element.type as { displayName?: string; name?: string }
    return typeObject.displayName ?? typeObject.name ?? "unknown"
  }

  return "unknown"
}

function isReactElementLike(value: unknown): value is { $$typeof: unknown } {
  return typeof value === "object" && value !== null && Object.prototype.hasOwnProperty.call(value, "$$typeof")
}

function serializeChild(child: React.ReactNode): string {
  if (React.isValidElement(child)) {
    return `ReactElement(${getElementTypeName(child)})`
  }

  if (typeof child === "object" && child !== null) {
    try {
      const json = JSON.stringify(
        child,
        (key, value) => {
          if (typeof key === "string" && key.startsWith("_")) {
            return "[React Internal]"
          }

          if (isReactElementLike(value)) {
            return "[ReactElement]"
          }

          if (typeof value === "bigint") {
            return value.toString()
          }

          return value
        },
        2
      )

      return json ?? "[Unserializable object]"
    } catch {
      return "[Unserializable object]"
    }
  }

  return String(child)
}

export function Slot({ children, ...props }: SlotProps) {
  if (!debugSlots) {
    return <OriginalSlot {...props}>{children}</OriginalSlot>
  }

  const serializedChildren = serializeChild(children)

  console.log("[SLOT RENDER]", {
    children: serializedChildren,
    childrenType: typeof children,
    isValidElement: React.isValidElement(children),
    isArray: Array.isArray(children),
    props: Object.keys(props),
  })

  if (React.isValidElement(children)) {
    const elementProps = Object.keys(children.props as Record<string, unknown>)
    const elementChildren = (children.props as { children?: React.ReactNode }).children ?? null

    console.log("[SLOT CHILDREN ELEMENT]", {
      elementType: getElementTypeName(children),
      elementProps,
      elementChildren,
    })
  }

  try {
    return <OriginalSlot {...props}>{children}</OriginalSlot>
  } catch (error) {
    console.error("[SLOT ERROR]", error)
    console.error("[SLOT ERROR CHILDREN]", serializedChildren)
    console.error("[SLOT ERROR PROPS]", props)
    throw error
  }
}
