import { convertFileSrc } from "@tauri-apps/api/core";
import {
  documentDir,
  join,
  resolveResource,
  resourceDir,
} from "@tauri-apps/api/path";
import { useEffect, useState } from "react";

export const TauriImage = (
  props: { path: string } & React.DetailedHTMLProps<
    React.ImgHTMLAttributes<HTMLImageElement>,
    HTMLImageElement
  >
) => {
  const [imagePath, setImagePath] = useState<string | null>(null);

  async function updatePaths() {
    setImagePath(convertFileSrc(await resolveResource(props.path)));
  }

  useEffect(() => {
    updatePaths();
  }, [props.path]);

  return <img src={imagePath || ""} {...props} />;
};
