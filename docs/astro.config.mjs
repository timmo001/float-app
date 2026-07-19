// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import starlight from "@astrojs/starlight";
import starlightLinksValidator from "starlight-links-validator";
import starlightLlmsTxt from "starlight-llms-txt";

export default defineConfig({
  site: "https://float-app.timmo.dev",
  integrations: [
    sitemap(),
    starlight({
      title: "float-app",
      editLink: {
        baseUrl: "https://github.com/timmo001/float-app/edit/main/docs/",
      },
      lastUpdated: true,
      plugins: [
        starlightLinksValidator(),
        starlightLlmsTxt({
          projectName: "float-app",
          description: "Persistently float selected Hyprland windows.",
          promote: ["index*"],
        }),
      ],
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/timmo001/float-app",
        },
      ],
      sidebar: [
        { label: "Overview", link: "/" },
        { label: "Install", link: "/install/" },
        { label: "Quick Start", link: "/quick-start/" },
        { label: "CLI", items: [{ autogenerate: { directory: "cli" } }] },
        {
          label: "Hyprland",
          items: [{ autogenerate: { directory: "hyprland" } }],
        },
      ],
    }),
  ],
});
