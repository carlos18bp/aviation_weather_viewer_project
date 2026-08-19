# Backend — Aviation Weather Viewer

- Proyecto Django: `aviation_weather_project`.
- Única app de dominio: `weather`.
- Base obligatoria: PostgreSQL/PostGIS mediante
  `django.contrib.gis.db.backends.postgis`.
- API pública, same-origin y sin trailing slash bajo `/api/v1/`.
- No implementar usuarios, auth, JWT, admin de producto, tareas en background,
  attachments ni generación meteorológica durante requests.
- Usar variables de entorno obligatorias y no introducir fallback con secretos o
  SQLite.
- Mantener views delgadas y respuestas sin detalles de infraestructura.
- Ejecutar solamente tests dirigidos, con el venv activo.
