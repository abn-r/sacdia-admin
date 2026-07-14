import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "SACDIA Admin",
  version: packageJson.version,
  copyright: `© ${currentYear}, SACDIA.`,
  meta: {
    title: "SACDIA Admin",
    description: "Panel administrativo SACDIA — gestión de clubes JA.",
  },
};
