export type GenericKubernetesResource = {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    namespace?: string;
    [key: string]: any;
    uid: string;
    labels?: { [key: string]: string };
    annotations?: { [key: string]: string };
    ownerReferences?: Array<{
      apiVersion: string;
      kind: string;
      name: string;
      controlled: boolean;
      blockOwnerDeletion: boolean;
      uid: string;
      [key: string]: any;
    }>;
  };
  [key: string]: any;
};
