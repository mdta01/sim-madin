/**
 * ============================================================================
 * AMBIENT MODULE DECLARATIONS — Mobile Apps (legacy placeholder)
 * ============================================================================
 * Status: this file is intentionally EMPTY (no module declarations).
 *
 * History:
 *   Originally declared ambient shims for `react-native`, `expo-secure-store`,
 *   `@expo/vector-icons`, `@react-navigation/*`, etc. — so that tsc could
 *   type-check the mobile apps from the root workspace WITHOUT requiring
 *   the full RN toolchain to be installed at root.
 *
 * Current state:
 *   Each mobile app now installs its own deps in apps/mobile-<name>/node_modules
 *   (via per-app `npm install --legacy-peer-deps`). Real type packages take
 *   precedence over ambient shims, so declaring shims here would create
 *   duplicate-identifier errors. This file is kept only so the per-app
 *   tsconfig.json `include` array (which references it) keeps working.
 *
 * If you need to add shims for modules NOT installed per-app, add them here.
 * ============================================================================
 */

