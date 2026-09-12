# Orbis Hackathon — SF, 12 sep 2026

Contexto del evento + estado del setup. Branch del equipo: `Dimonk-ChileTeam`.

## El evento

Primer hackathon de **Visko Orbis**, el Live Model que genera video en tiempo real
y reacciona mientras el mundo cambia (lanzado el 1 de septiembre). 100 builders,
un día, con los equipos de research e ingeniería de Visko en la sala.

- **Lugar:** Ferry Building, 1 Ferry Building, SF. Lobby en el medio de la planta
  baja, a la izquierda mirando el edificio. Decile a seguridad que venís al
  *Visko hackathon* y te suben al segundo piso. Sala detrás del cartel
  "Port of San Francisco".
- **Partners:** Reactor (plataforma de video generativo en tiempo real) y
  Nebius (NASDAQ: NBIS).
- **Hosts:** Ying Yang, Will Yin, Ahmed Ahres, Harvey Michael Pratt,
  Nebius Developer Community.

## Agenda

> ⚠️ El evento corre en **hora de SF (PT)**. Chile está **+4h**.

| PT | Chile | |
|---|---|---|
| 10:00 | 14:00 | Puertas, check-in |
| 10:30 | 14:30 | Kickoff, demo walkthrough, armado de equipos |
| 11:30 | 15:30 | Arranca el hackathon |
| 13:00 | 17:00 | Almuerzo + charla técnica informal sobre el modelo |
| **17:00** | **21:00** | **Presentaciones y jueces** ← deadline real |
| 18:00 | 22:00 | Cierre |

## Premios

1° **$4,000** · 2° **$2,000** · 3° **$1,000** en efectivo.
Todos los participantes reciben créditos gratis de Nebius vía el Nebius Builder Program.

## Qué se juzga

El brief pide construir la primera generación de aplicaciones de **video en vivo**:
entretenimiento, juegos, retail, educación, robótica, medios, y categorías que
todavía no existen.

> "no longer a finished clip, but a world that runs, reacts, and evolves"

Traducción práctica: **no gana el video más lindo, gana el video que reacciona.**
El diferencial de Orbis es `set_prompt` mientras el stream corre — el steering
entra en el borde del próximo chunk (~1.8s). Un demo donde un input del mundo
real cambia el video en vivo pesa más que cualquier pulido visual.

## Estado del setup

| Pieza | Estado |
|---|---|
| Repo clonado + branch `Dimonk-ChileTeam` | ✅ |
| `npm install` + `npm run typecheck` | ✅ |
| Dev server `npm run dev` → http://localhost:3000 | ✅ |
| `REACTOR_API_KEY` → `POST /api/token` | ✅ 200, JWT válido |
| `GEMINI_API_KEY` → `gemini-2.5-flash` (texto) | ✅ 200 |
| `GEMINI_API_KEY` → `gemini-2.5-flash-image` (Nano Banana) | ❌ 429 |

## Límites conocidos (leer antes de debuggear)

**1. Una sola sesión concurrente.** El JWT sale con `max_sessions: 1` y scope
solo a `reactor/visko-orbis-stable`, vence en 1h. Si un compañero tiene un stream
abierto, el tuyo no conecta. **Coordinar esto antes de presentar.**

**2. El modelo de imagen de Gemini no tiene free tier.** La key autentica bien
(texto responde 200), pero el proyecto `1043942847398` devuelve `limit: 0` para
`gemini-2.5-flash-image`. Reintentar nunca funciona; solo se arregla activando
billing en ese proyecto de Google Cloud.
→ Consecuencia: el camino principal de Orbis (connect → `set_prompt` → `start`
→ steering en vivo) **funciona sin Gemini**. Lo único bloqueado es el ejemplo
del `dog.png`, que no es lo que se juzga.

**3. Los route handlers colapsan todo en un 502 genérico.** El error real de
upstream está en el log del dev server, no en la respuesta HTTP. Mirá ahí primero.

## Comandos

```bash
npm run dev        # http://localhost:3000
npm run typecheck
npm run build
```

Las keys van en `.env.local` (ya está en `.gitignore`, no se commitea):

```dotenv
REACTOR_API_KEY=rk_...
GEMINI_API_KEY=AQ....
```

> 🔑 Ambas keys circularon en chat — **rotarlas cuando termine el hackathon.**

## Notas del modelo

- El prompt es obligatorio antes de `start`; la imagen de referencia es opcional.
- Imagen de referencia 16:9 funciona mejor; otros aspect ratios se redimensionan
  sin crop y pueden distorsionar.
- Después de conectar, `state.available_resolutions` manda sobre los tiers
  documentados (`1080p`, `2k`, `4k`). `set_resolution` aplica desde el próximo
  `start`, no durante el run. Para probar conviene `1080p` — la resolución es la
  palanca de consumo más grande.
- Orbis emite chunks cada ~1.8s. El primer chunk no trae frames mientras el
  upscaler calienta: es esperado.
- Los comandos son asíncronos. La fuente de verdad son los eventos del modelo:
  `state`, `prompt_accepted`, `resolution_accepted`, `generation_started`,
  `chunk_complete`, `command_error`.
- `pause` aplica después del chunk actual, `resume` sigue la misma generación,
  `reset` limpia prompt e imagen.
