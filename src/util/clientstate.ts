import { atom } from "jotai";

export const kubernetesResourceAtom = atom<{
  [key: string]: any[];
}>({});

export const useKubernetesResourceCache = (key: string) => {
  const resourceAtom = atom(
    (get) => {
      const cache = get(kubernetesResourceAtom);
      return cache[key] || [];
    },
    (get, set, updateFn: (current: any[]) => any[]) => {
      const cache = get(kubernetesResourceAtom);
      set(kubernetesResourceAtom, {
        ...cache,
        [key]: updateFn(cache[key] || []),
      });
    }
  );
  return resourceAtom;
};
