'use client'

import * as React from "react"
import { Button as OriginalButton } from "./button"

const debugUi = process.env.NEXT_PUBLIC_DEBUG_UI === 'true'

export function Button({ children, ...props }: React.ComponentProps<typeof OriginalButton>) {
  if (!debugUi) {
    return <OriginalButton {...props}>{children}</OriginalButton>
  }

  const serializedChildren = React.isValidElement(children) ? 'ReactElement' :
    typeof children === 'object' && children !== null ? JSON.stringify(children, null, 2) :
    String(children);
  console.log('[BUTTON RENDER]', {
    children: serializedChildren,
    childrenType: typeof children,
    isValidElement: React.isValidElement(children),
    asChild: props.asChild,
    variant: props.variant
  });
  try {
    return <OriginalButton {...props}>{children}</OriginalButton>;
  } catch (e) {
    console.error('[BUTTON ERROR]', e);
    console.error('[BUTTON ERROR CHILDREN]', serializedChildren);
    throw e;
  }
}
