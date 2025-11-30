import { Link } from "@radix-ui/themes";
import { NavLink } from "react-router";

export const NoSelectStyle: React.CSSProperties = {
  WebkitUserSelect: "none" as const,
  userSelect: "none" as const,
};
export const NoSelect = (props: { children: React.ReactNode }) => {
  return (
    <span style={{ WebkitUserSelect: "none", userSelect: "none" }}>
      {props.children}
    </span>
  );
};

export const WrappedLink = (
  props: React.PropsWithChildren<
    React.ComponentProps<typeof Link> & React.ComponentProps<typeof NavLink>
  >
) => {
  return (
    <Link asChild {...props}>
      <NavLink {...props}>{props.children}</NavLink>
    </Link>
  );
};
