// eslint-config-next 16 ships native flat configs; the previous FlatCompat
// bridge crashed against them, so `pnpm lint` could not run at all.
import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

const config = [
  { ignores: [".next/**"] },
  ...coreWebVitals,
  ...typescript
];

export default config;
