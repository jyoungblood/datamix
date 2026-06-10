declare module "next/link" {
  import type * as React from "react";

  type LinkHref =
    | string
    | {
        pathname?: string;
        query?: Record<string, boolean | number | string | null | undefined>;
      };

  type NavigateEvent = {
    defaultPrevented: boolean;
    preventDefault: () => void;
    url: URL;
  };

  type LinkProps = Omit<
    React.AnchorHTMLAttributes<HTMLAnchorElement>,
    "href"
  > & {
    as?: string;
    href: LinkHref;
    locale?: false | string;
    onNavigate?: (event: NavigateEvent) => void;
    passHref?: boolean;
    prefetch?: boolean;
    replace?: boolean;
    scroll?: boolean;
  };

  const Link: React.ForwardRefExoticComponent<
    LinkProps & React.RefAttributes<HTMLAnchorElement>
  >;

  export function useLinkStatus(): { pending: boolean };

  export default Link;
}
