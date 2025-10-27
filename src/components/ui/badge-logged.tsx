import * as React from "react"
import { Badge as OriginalBadge } from "./badge"

export function Badge({ children, ...props }: React.ComponentProps<typeof OriginalBadge>) {
  console.log('[BADGE RENDER]', { children, childrenType: typeof children, isValidElement: React.isValidElement(children) });
  try {
    return <OriginalBadge {...props}>{children}</OriginalBadge>;
  } catch (e) {
    console.error('[BADGE ERROR]', e);
    throw e;
  }
}
