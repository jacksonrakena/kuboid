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
