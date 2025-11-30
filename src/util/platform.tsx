export const NoSelect = (props: { children: React.ReactNode }) => {
  return (
    <span style={{ WebkitUserSelect: "none", userSelect: "none" }}>
      {props.children}
    </span>
  );
};
