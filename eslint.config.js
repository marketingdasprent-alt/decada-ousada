import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier";

export default tseslint.config(
  {
    ignores: [
      "dist",
      "android/**",
      "ios/**",
      "supabase/**",                          // Edge Functions Deno — sintaxe diferente
      "*.js",                                 // ficheiros JS na raiz (scripts utilitários)
      "src/integrations/supabase/types.ts",   // ficheiro auto-gerado pelo Supabase CLI
      ".claude/**",                           // worktrees internos do Claude
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended, prettierConfig],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],

      // Desligado — projecto usa `any` extensivamente com Supabase e dados dinâmicos
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",

      // Desligado — tailwind.config.ts usa require(); padrão legítimo em configs
      "@typescript-eslint/no-require-imports": "off",

      // Desligado — interfaces vazias usadas como extensão de tipo (padrão shadcn)
      "@typescript-eslint/no-empty-object-type": "off",

      // Desligado — escapes em regex são intencionais (validações PT)
      "no-useless-escape": "off",

      // Rebaixado a warning — não bloqueia CI mas permanece visível
      "prefer-const": "warn",
      "no-empty": "warn",
      "@typescript-eslint/ban-ts-comment": "warn",
      "react-hooks/exhaustive-deps": "warn",
      // warn em vez de error: violações existem em produção a funcionar; corrigir gradualmente
      "react-hooks/rules-of-hooks": "warn",
    },
  }
);
