"use client";

import Link, { type LinkProps } from "@mui/material/Link";
import NextLink from "next/link";

export default function NavLink(props: Omit<LinkProps, "component"> & { href: string }) {
  return <Link component={NextLink} underline="hover" {...props} />;
}
