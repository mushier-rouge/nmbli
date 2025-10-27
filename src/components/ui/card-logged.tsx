'use client'

import * as React from "react"
import { Card as OriginalCard, CardHeader as OriginalCardHeader, CardTitle as OriginalCardTitle, CardContent as OriginalCardContent, CardFooter as OriginalCardFooter } from "./card"

const debugUi = process.env.NEXT_PUBLIC_DEBUG_UI === 'true'

export function Card({ children, ...props }: React.ComponentProps<typeof OriginalCard>) {
  if (!debugUi) {
    return <OriginalCard {...props}>{children}</OriginalCard>
  }
  console.log('[CARD RENDER]', { hasChildren: !!children, childrenType: typeof children, childrenIsArray: Array.isArray(children) });
  try {
    return <OriginalCard {...props}>{children}</OriginalCard>;
  } catch (e) {
    console.error('[CARD ERROR]', e);
    throw e;
  }
}

export function CardHeader({ children, ...props }: React.ComponentProps<typeof OriginalCardHeader>) {
  if (!debugUi) {
    return <OriginalCardHeader {...props}>{children}</OriginalCardHeader>
  }
  console.log('[CARD HEADER RENDER]', { hasChildren: !!children, childrenType: typeof children });
  try {
    return <OriginalCardHeader {...props}>{children}</OriginalCardHeader>;
  } catch (e) {
    console.error('[CARD HEADER ERROR]', e);
    throw e;
  }
}

export function CardTitle({ children, ...props }: React.ComponentProps<typeof OriginalCardTitle>) {
  if (!debugUi) {
    return <OriginalCardTitle {...props}>{children}</OriginalCardTitle>
  }
  const serializedChildren = React.isValidElement(children) ? 'ReactElement' :
    typeof children === 'object' && children !== null ? JSON.stringify(children, null, 2) :
    String(children);
  console.log('[CARD TITLE RENDER]', {
    children: serializedChildren,
    childrenType: typeof children,
    isValidElement: React.isValidElement(children),
    isArray: Array.isArray(children),
    isNull: children === null,
    isUndefined: children === undefined
  });
  try {
    return <OriginalCardTitle {...props}>{children}</OriginalCardTitle>;
  } catch (e) {
    console.error('[CARD TITLE ERROR]', e);
    console.error('[CARD TITLE ERROR CHILDREN]', serializedChildren);
    throw e;
  }
}

export function CardContent({ children, ...props }: React.ComponentProps<typeof OriginalCardContent>) {
  if (!debugUi) {
    return <OriginalCardContent {...props}>{children}</OriginalCardContent>
  }
  console.log('[CARD CONTENT RENDER]', { hasChildren: !!children, childrenType: typeof children });
  try {
    return <OriginalCardContent {...props}>{children}</OriginalCardContent>;
  } catch (e) {
    console.error('[CARD CONTENT ERROR]', e);
    throw e;
  }
}

export function CardFooter({ children, ...props }: React.ComponentProps<typeof OriginalCardFooter>) {
  if (!debugUi) {
    return <OriginalCardFooter {...props}>{children}</OriginalCardFooter>
  }
  console.log('[CARD FOOTER RENDER]', { hasChildren: !!children, childrenType: typeof children });
  try {
    return <OriginalCardFooter {...props}>{children}</OriginalCardFooter>;
  } catch (e) {
    console.error('[CARD FOOTER ERROR]', e);
    throw e;
  }
}
