import { KubeConfig } from "@kubernetes/client-node";
import { atom } from "jotai";

export const currentConfigAtom = atom<KubeConfig | null>(null);
