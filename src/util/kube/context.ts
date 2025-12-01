import { KubeConfig } from "@kubernetes/client-node";
import { atom } from "jotai";
import { KubeConfigInfo } from "../..";

export const currentConfigAtom = atom<KubeConfig | null>(null);
export const currentContextAtom = atom<string | null>(null);
export const currentKubeContextAtom = atom<KubeConfigInfo | null>(null);