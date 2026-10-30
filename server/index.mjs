// Servidor del CRM. Uso: npm run build && npm start   (variables: PORT, CRM_DATA_DIR)
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { crearApp } from './app.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT) || 3100;
const DATA_DIR = path.resolve(process.env.CRM_DATA_DIR || path.join(ROOT, 'server', 'data'));

const app = crearApp({ dataDir: DATA_DIR, distDir: path.join(ROOT, 'dist') });

// Revisa vencimientos (cotizaciones de 7 días y plazos de tickets) aunque nadie esté usando la app.
setInterval(() => {
    try {
        app.locals.procesarVencimientos(true);
    } catch (e) {
        console.error('Error al procesar vencimientos:', e.message);
    }
}, 5 * 60 * 1000).unref();

app.listen(PORT, () => {
    console.log(`CRM listo en http://localhost:${PORT}`);
    for (const lista of Object.values(os.networkInterfaces())) {
        for (const i of lista || []) {
            if (i.family === 'IPv4' && !i.internal) console.log(`  En tu red local: http://${i.address}:${PORT}`);
        }
    }
    console.log(`  Datos en: ${DATA_DIR}`);
});
