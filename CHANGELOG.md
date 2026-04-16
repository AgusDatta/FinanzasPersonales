# Changelog

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y [Semantic Versioning](https://semver.org/lang/es/).

## [Unreleased] / 2.0.0-alpha.1

Reescritura completa hacia una arquitectura modular y profesional.

### Added
- Stack moderno: Vite + TypeScript (strict) + Dexie + Zod + date-fns + decimal.js.
- **Multi-cuenta** con tipos (banco/efectivo/tarjeta/ahorro) y moneda propia.
- **Transferencias** entre cuentas (con soporte cross-currency).
- **Presupuestos** mensuales/semanales/anuales por categoría con alertas al 80% y 100%.
- **Metas de ahorro** con deadline y progreso.
- **Transacciones recurrentes** con frecuencia diaria/semanal/mensual/anual y pausa/reanudación.
- **Multi-moneda**: ARS, USD, EUR, BRL, CLP, UYU. Cotización USD↔ARS vía dolarapi.com (blue/MEP/oficial) con cache offline y fallback manual.
- **Importar CSV** de bancos argentinos (Galicia, Santander, BBVA, Mercado Pago) con deduplicación automática.
- **Dashboard** con KPIs, tendencia 12 meses, top categorías, forecast simple.
- **Insights automáticos** (month-over-month, savings rate, budget warnings).
- **Dark mode** con persistencia y sync con OS.
- **Responsive** mobile-first.
- **Accesibilidad WCAG AA**: foco visible, ARIA, navegación por teclado, focus trap en modales.
- **Atajos de teclado**: `N`, `/`, chords `g d/t/a/b/r/s`.
- **i18n** es-AR / en.
- **PWA instalable** con offline-first y workbox runtime caching.
- **Undo** en eliminaciones vía toast.
- **BroadcastChannel** para sync entre pestañas.
- **Recovery screen** si la base se corrompe.
- **Detección de QuotaExceededError** con sugerencia de export.
- **Export/import JSON** con schema versionado y checksum.
- Tests unitarios (Vitest) de dominio, repos, parsers CSV, analytics.
- Tests E2E (Playwright) del flujo principal.
- CI con GitHub Actions (lint + typecheck + test + build + E2E).
- Deploy automático a GitHub Pages.

### Changed
- Migración automática de `localStorage` (v1) a IndexedDB. Backup del raw queda guardado por si algo falla.
- Toda la lógica pasa por schemas Zod antes de persistir.

### Security / Privacy
- Sin backend, sin analytics, sin tracking.
- Toda request externa es opcional y está cacheada.

## [1.0.0] - 2025

Versión inicial:
- Movimientos con descripción/monto/categoría/fecha.
- Filtros por fecha.
- Gráfico de torta y por categoría.
- Export a CSV/JSON/PNG/PDF.
- Storage en localStorage.
