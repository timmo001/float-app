import { docsConfig } from "@timmo001/docs-kit/blume";
import { defineConfig } from "blume";

export default defineConfig(
  docsConfig({
    title: "float-app",
    description: "Persistently float selected Hyprland windows.",
    site: "float-app.timmo.dev",
    github: { owner: "timmo001", repo: "float-app" },
    navigation: {
      sidebar: [
        "/",
        "/install",
        "/quick-start",
        {
          label: "CLI",
          items: ["/cli", "/cli/commands"],
        },
        {
          label: "Hyprland",
          items: ["/hyprland/rules"],
        },
      ],
    },
  }),
);
