declare module "virtual:mura-recipes" {
  const recipes: readonly string[];
  export default recipes;
}

declare module "virtual:mura-v1-targets" {
  const targets: readonly string[];
  export default targets;
}

declare module "virtual:mura-v1-procedures" {
  const procedures: readonly string[];
  export default procedures;
}

declare module "virtual:mura-v1-raw-data" {
  const documents: readonly {
    readonly path: string;
    readonly text: string;
  }[];
  export default documents;
}
