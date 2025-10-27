'use client'

import * as React from "react"
import { Slot as OriginalSlot } from "@radix-ui/react-slot"

export function Slot({ children, ...props }: React.ComponentProps<typeof OriginalSlot>) {
  const serializedChildren = React.isValidElement(children) ?
    `ReactElement(${(children as any).type?.name || (children as any).type || 'unknown'})` :
    typeof children === 'object' && children !== null ?
      JSON.stringify(children, (key, value) => {
        // Handle circular references and React elements
        if (key.startsWith('_')) return '[React Internal]';
        if (value && typeof value === 'object' && value.$$typeof) return '[ReactElement]';
        return value;
      }, 2) :
    String(children);

  console.log('[SLOT RENDER]', {
    children: serializedChildren,
    childrenType: typeof children,
    isValidElement: React.isValidElement(children),
    isArray: Array.isArray(children),
    props: Object.keys(props)
  });

  // Log children structure in detail
  if (React.isValidElement(children)) {
    console.log('[SLOT CHILDREN ELEMENT]', {
      elementType: (children as any).type,
      elementProps: Object.keys((children as any).props || {}),
      elementChildren: (children as any).props?.children
    });
  }

  try {
    return <OriginalSlot {...props}>{children}</OriginalSlot>;
  } catch (e) {
    console.error('[SLOT ERROR]', e);
    console.error('[SLOT ERROR CHILDREN]', serializedChildren);
    console.error('[SLOT ERROR PROPS]', props);
    throw e;
  }
}
