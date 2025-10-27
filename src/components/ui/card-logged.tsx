import * as React from "react"
import { Card as OriginalCard, CardHeader as OriginalCardHeader, CardTitle as OriginalCardTitle, CardContent as OriginalCardContent, CardFooter as OriginalCardFooter } from "./card"

export function Card({ children, ...props }: React.ComponentProps<typeof OriginalCard>) {
  console.log('[CARD RENDER]', { hasChildren: !!children, childrenType: typeof children, childrenIsArray: Array.isArray(children) });
  try {
    return <OriginalCard {...props}>{children}</OriginalCard>;
  } catch (e) {
    console.error('[CARD ERROR]', e);
    throw e;
  }
}

export function CardHeader({ children, ...props }: React.ComponentProps<typeof OriginalCardHeader>) {
  console.log('[CARD HEADER RENDER]', { hasChildren: !!children, childrenType: typeof children });
  try {
    return <OriginalCardHeader {...props}>{children}</OriginalCardHeader>;
  } catch (e) {
    console.error('[CARD HEADER ERROR]', e);
    throw e;
  }
}

export function CardTitle({ children, ...props }: React.ComponentProps<typeof OriginalCardTitle>) {
  console.log('[CARD TITLE RENDER]', { children, childrenType: typeof children, isValidElement: React.isValidElement(children) });
  try {
    return <OriginalCardTitle {...props}>{children}</OriginalCardTitle>;
  } catch (e) {
    console.error('[CARD TITLE ERROR]', e);
    throw e;
  }
}

export function CardContent({ children, ...props }: React.ComponentProps<typeof OriginalCardContent>) {
  console.log('[CARD CONTENT RENDER]', { hasChildren: !!children, childrenType: typeof children });
  try {
    return <OriginalCardContent {...props}>{children}</OriginalCardContent>;
  } catch (e) {
    console.error('[CARD CONTENT ERROR]', e);
    throw e;
  }
}

export function CardFooter({ children, ...props }: React.ComponentProps<typeof OriginalCardFooter>) {
  console.log('[CARD FOOTER RENDER]', { hasChildren: !!children, childrenType: typeof children });
  try {
    return <OriginalCardFooter {...props}>{children}</OriginalCardFooter>;
  } catch (e) {
    console.error('[CARD FOOTER ERROR]', e);
    throw e;
  }
}
