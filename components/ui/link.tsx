import * as React from 'react';

import { cn } from '@/lib/utils';

const Link = React.forwardRef<HTMLAnchorElement, React.AnchorHTMLAttributes<HTMLAnchorElement>>(
  ({ className, ...props }, ref) => {
    return <a className={cn('text-accent', className)} ref={ref} {...props} />;
  }
);
Link.displayName = 'Link';

export { Link };
