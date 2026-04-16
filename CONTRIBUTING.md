# Contribuir a Finanzas Personales

¡Gracias por querer contribuir! Este documento cubre cómo proponer cambios.

## Cómo empezar

1. Forkeá el repo y cloná tu fork.
2. Instalá dependencias: `npm install`.
3. Creá una branch desde `main`: `git checkout -b feat/mi-feature`.
4. Hacé tus cambios y asegurate que pase todo: `npm run lint && npm run typecheck && npm run test`.
5. Abrí un PR con una descripción clara del problema y la solución.

## Convenciones

### Commits
Seguimos [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` nueva funcionalidad
- `fix:` corrección de bug
- `refactor:` cambio de código sin alterar comportamiento
- `docs:` solo documentación
- `test:` agregar o corregir tests
- `chore:` mantenimiento, build, deps

### Código
- **TypeScript strict**: evitá `any`, preferí tipos precisos.
- **Domain-first**: la lógica de negocio va en `src/domain/` o `src/features/<x>/`. El DOM vive en `src/ui/` y `src/features/<x>/view.ts`.
- **Validación con Zod** en toda entrada externa (formularios, imports).
- **Money**: todo importe monetario usa la clase `Money` (decimal.js). Nunca `number` crudo.
- **Sin floats**: el string decimal es la fuente de verdad.
- **Sin librerías UI**: mantenemos cero dependencias de framework en el runtime.

### Tests
- Todo cambio en `src/domain/` o `src/db/repositories/` requiere test nuevo o actualizado.
- E2E en `tests/e2e/` solo para flujos críticos.

### Commits grandes
Si tu cambio cruza múltiples features, considerá dividirlo en PRs más chicos.

## Reportar bugs

Incluí:
- Versión del navegador y OS.
- Pasos para reproducir.
- Qué esperabas y qué pasó.
- Screenshots o video si aplica.
- Si podés, un export de tu data (o data de prueba que reproduzca el bug).

## Seguridad

Si encontrás una vulnerabilidad, **no** abras un issue público. Escribí directamente al autor del repo.

## Code of conduct

Sé buena onda.
