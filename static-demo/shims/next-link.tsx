import type { AnchorHTMLAttributes } from "react";
import { pathToHash } from "./next-navigation";

export default function Link({ href, ...p }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  return <a {...p} href={"#" + pathToHash(href)} />;
}
