import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Passiamo il percorso esatto al file di configurazione
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  /* qui vanno le tue eventuali configurazioni di Next.js */
};

export default withNextIntl(nextConfig);