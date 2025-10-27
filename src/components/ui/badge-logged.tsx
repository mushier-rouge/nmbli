'use client'

import * as React from "react"
import { Badge as OriginalBadge } from "./badge"

export function Badge({ children, ...props }: React.ComponentProps<typeof OriginalBadge>) {
  const serializedChildren = React.isValidElement(children) ? 'ReactElement' :
    typeof children === 'object' && children !== null ? JSON.stringify(children, null, 2) :
    String(children);
  console.log('[BADGE RENDER]', {
    children: serializedChildren,
    childrenType: typeof children,
    isValidElement: React.isValidElement(children),
    isArray: Array.isArray(children),
    variant: props.variant
  });
  try {
    return <OriginalBadge {...props}>{children}</OriginalBadge>;
  } catch (e) {
    console.error('[BADGE ERROR]', e);
    console.error('[BADGE ERROR CHILDREN]', serializedChildren);
    throw e;
  }
}
