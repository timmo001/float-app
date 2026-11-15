import { defineConfig } from "oxlint";
import recommendedEffect from "@timmo001/oxlint-rules/configs/recommended-effect";

export default defineConfig({
  extends: [recommendedEffect],
  ignorePatterns: ["docs/**", ".agents/**"],
  options: {
    typeAware: true,
    typeCheck: true,
    maxWarnings: 0,
  },
});
