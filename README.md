# Portafolio — David Roa

Sitio estático (HTML + CSS + JS, sin dependencias ni compilación).

## Archivos
- `index.html` — contenido de todas las secciones.
- `styles.css` — diseño (modo claro, vidrio líquido, skeleton loaders).
- `app.js` — interacciones: carga con esqueletos, demo "¿pistola o persona?", maqueta del cruce SAP.

## Antes de publicar
1. En `index.html`, sección **Contacto**, cambia `TU_CORREO@ejemplo.com` y `TU_USUARIO` (LinkedIn y GitHub).
2. Si cambias `styles.css` o `app.js`, sube el número `?v=2` en `index.html` para que el navegador no use la versión vieja.

## Ver en local
```bash
python3 -m http.server 5173
```
Y abre http://localhost:5173

## Publicar
- **Netlify:** arrastra la carpeta a https://app.netlify.com/drop
- **GitHub Pages:** sube los archivos a un repositorio público y activa Pages en *Settings → Pages* (rama `main`, carpeta raíz).

## Confidencialidad
Las maquetas usan datos inventados. No agregues capturas reales, código de LEMOND ni de Operación BOS, el dominio interno ni la pantalla de inicio de sesión.
