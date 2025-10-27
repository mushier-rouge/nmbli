'use client'

import * as React from "react"
import Link from "next/link"

const debugUi = process.env.NEXT_PUBLIC_DEBUG_UI === 'true'

export function LoggedLink({ children, ...props }: React.ComponentProps<typeof Link>) {
  if (!debugUi) {
    return <Link {...props}>{children}</Link>
  }

  const serializedChildren = React.isValidElement(children) ? 'ReactElement' :
    typeof children === 'object' && children !== null ? JSON.stringify(children, null, 2) :
    String(children);
  console.log('[LINK RENDER]', {
    children: serializedChildren,
    childrenType: typeof children,
    isValidElement: React.isValidElement(children),
    href: props.href
  });
  try {
    return <Link {...props}>{children}</Link>;
  } catch (e) {
    console.error('[LINK ERROR]', e);
    console.error('[LINK ERROR CHILDREN]', serializedChildren);
    throw e;
  }
}
