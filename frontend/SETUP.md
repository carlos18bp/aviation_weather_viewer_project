# Setup frontend

Requisitos: Node.js 22 y el backend disponible en `http://localhost:8000`.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

`NEXT_PUBLIC_BACKEND_ORIGIN` se consume únicamente en el servidor Next.js para
las rewrites same-origin. La Fase 00 no requiere API keys, OAuth, CAPTCHA ni
variables de tema.
