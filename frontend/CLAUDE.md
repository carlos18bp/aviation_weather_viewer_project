# Frontend — Aviation Weather Viewer

- Next.js App Router, React y TypeScript; preferir Server Components.
- La ruta del visor es `/` y ocupa el viewport completo.
- Existe un único tema oscuro con los tokens congelados en `app/globals.css`.
- No crear theme toggle, variante light, auth, comercio ni navegación heredada.
- MapLibre está instalado para fases posteriores; Fase 00 no crea una instancia
  de mapa ni carga assets meteorológicos.
- El warning operacional debe permanecer visible.
- Evitar estado o client components cuando el contenido sea estático.
- Probar comportamiento visible con Testing Library; máximo dos specs E2E por
  comando.
