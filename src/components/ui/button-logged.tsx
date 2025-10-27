import * as React from "react"
import { Button as OriginalButton } from "./button"

export function Button({ children, ...props }: React.ComponentProps<typeof OriginalButton>) {
  console.log('[BUTTON RENDER]', { children, childrenType: typeof children, asChild: props.asChild, variant: props.variant });
  try {
    return <OriginalButton {...props}>{children}</OriginalButton>;
  } catch (e) {
    console.error('[BUTTON ERROR]', e);
    throw e;
  }
}
