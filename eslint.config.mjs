import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Deshabilitado: el proyecto usa `any` extensamente en datos de Supabase
      // Se puede re-habilitar progresivamente cuando se añadan tipos estrictos
      "@typescript-eslint/no-explicit-any": "off",

      // Deshabilitado: variables no usadas son warnings, no bloquean el deploy
      "@typescript-eslint/no-unused-vars": "warn",

      // Deshabilitado: setState en useEffect es un patrón usado en BreedSelect e invite page
      "react-hooks/set-state-in-effect": "off",

      // Deshabilitado: se usan <a> en algunos sitios intencionalmente
      "@next/next/no-html-link-for-pages": "warn",

      // Deshabilitado: se usan <img> en galería y avatar con URLs dinámicas de Supabase Storage
      // next/image no soporta bien URLs firmadas de Supabase sin configuración adicional
      "@next/next/no-img-element": "off",

      // Deshabilitado: comillas sin escapar en JSX (textos en español con comillas)
      "react/no-unescaped-entities": "off",

      // Deshabilitado: exhaustive-deps genera falsos positivos con callbacks estables
      "react-hooks/exhaustive-deps": "warn",
    },
  },
]);

export default eslintConfig;
