<p align="center">
  <img src="docs/banner.svg" alt="SteamBandage" width="100%">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/versión-0.1.0-c2183a?style=for-the-badge&labelColor=0c0a0e" alt="versión">
  <img src="https://img.shields.io/badge/Electron-45-c2183a?style=for-the-badge&logo=electron&logoColor=ff4d6d&labelColor=0c0a0e" alt="Electron">
  <img src="https://img.shields.io/badge/React-18-c2183a?style=for-the-badge&logo=react&logoColor=ff4d6d&labelColor=0c0a0e" alt="React">
  <img src="https://img.shields.io/badge/Windows-11-c2183a?style=for-the-badge&logo=windows11&logoColor=ff4d6d&labelColor=0c0a0e" alt="Windows">
  <img src="https://img.shields.io/badge/licencia-MIT-c7a774?style=for-the-badge&labelColor=0c0a0e" alt="MIT">
</p>

<p align="center">
  <a href="#-instalación"><b>Instalación</b></a> &nbsp;✦&nbsp;
  <a href="#-cómo-funciona"><b>Cómo funciona</b></a> &nbsp;✦&nbsp;
  <a href="#-capturas"><b>Capturas</b></a> &nbsp;✦&nbsp;
  <a href="#-iniciar-sesión"><b>Iniciar sesión</b></a> &nbsp;✦&nbsp;
  <a href="#-ajustes"><b>Ajustes</b></a> &nbsp;✦&nbsp;
  <a href="#-preguntas"><b>Preguntas</b></a>
</p>

<br>

<p align="center">
  <img src="docs/screens/hero.webp" alt="SteamBandage farmeando" width="92%">
</p>

<p align="center"><img src="docs/divider.svg" width="420"></p>

<h3 align="center"><i>Un farmeador de cromos que no desperdicia ni un minuto.</i></h3>

<p align="center">
SteamBandage inicia sesión como un cliente de Steam aparte y le dice a Steam que estás jugando, <b>sin abrir ningún juego</b>.<br>
No consume CPU ni GPU, sigue cuántos cromos le quedan a cada juego y pasa al siguiente en cuanto se acaban.<br>
Si abres un juego, se pausa solo. Cuando lo cierras, retoma.
</p>

<br>

<table>
<tr>
<td width="33%" valign="top">

### ✦ Indicador de drop
Un anillo con la cuenta regresiva estimada hasta el próximo cromo. **Aprende de tu cuenta**: usa la mediana de los intervalos reales que va midiendo.

</td>
<td width="33%" valign="top">

### ✦ Algoritmo de 2 fases
Farmea de uno en uno los juegos que ya sueltan cromos y pone a sumar horas, hasta 32 a la vez, a los que todavía no.

</td>
<td width="33%" valign="top">

### ✦ Juega tranquilo
Cuando Steam detecta que estás jugando en tu PC, se pausa automáticamente. Al cerrar el juego retoma sin que hagas nada.

</td>
</tr>
<tr>
<td width="33%" valign="top">

### ✦ Autoventa opcional
Lista los cromos nuevos en el mercado al precio más bajo o un centavo por debajo. **Viene apagada.**

</td>
<td width="33%" valign="top">

### ✦ Cero recursos
No lanza procesos falsos de juegos. Solo una conexión ligera con Steam, y se queda en la bandeja del sistema.

</td>
<td width="33%" valign="top">

### ✦ Login con QR
Escaneas el código con la app de Steam y apruebas. **SteamBandage nunca ve tu contraseña**: solo recibe un token, que se guarda cifrado con Windows.

</td>
</tr>
</table>

<p align="center"><img src="docs/divider.svg" width="420"></p>

## ✦ Capturas

<table>
<tr>
<td align="center" width="50%"><img src="docs/screens/over.webp" alt="Cromo inminente"><br><sub><b>Inminente</b> · ya pasó la ventana estimada, puede caer en cualquier momento</sub></td>
<td align="center" width="50%"><img src="docs/screens/multi.webp" alt="Calentamiento"><br><sub><b>Calentamiento</b> · varios juegos sumando horas a la vez</sub></td>
</tr>
<tr>
<td align="center"><img src="docs/screens/paused.webp" alt="Pausa automática"><br><sub><b>Pausa automática</b> · estás jugando, retoma solo al cerrar</sub></td>
<td align="center"><img src="docs/screens/settings.webp" alt="Ajustes"><br><sub><b>Ajustes</b> · umbral de horas, orden, autoventa</sub></td>
</tr>
<tr>
<td align="center"><img src="docs/screens/login.webp" alt="Login con QR"><br><sub><b>Login con QR</b> · detecta tu cuenta y la apruebas desde el celular</sub></td>
<td align="center"><img src="docs/screens/scanned.webp" alt="QR escaneado"><br><sub><b>Escaneado</b> · solo falta tocar Aprobar en la app de Steam</sub></td>
</tr>
</table>

<p align="center"><img src="docs/divider.svg" width="420"></p>

## ✦ Cómo funciona

```mermaid
%%{init: {'theme':'base','themeVariables':{'primaryColor':'#19151c','primaryTextColor':'#ece4e8','primaryBorderColor':'#c2183a','lineColor':'#c7a774','secondaryColor':'#141117','tertiaryColor':'#0c0a0e','fontFamily':'Inter, sans-serif'}}}%%
flowchart LR
    A([Login con QR]) --> B[Leer insignias]
    B --> C{¿Algún juego<br/>con ≥ 2 h?}
    C -- sí --> D[✦ SOLO<br/>un juego a la vez]
    C -- no --> E[CALENTAMIENTO<br/>hasta 32 juegos]
    E -- cada 10 min --> B
    D -- check cada 5 min<br/>o aviso de item nuevo --> F{¿Cayó un cromo?}
    F -- sí --> G[+1 · aprende el intervalo<br/>· autoventa opcional]
    F -- no --> D
    G --> H{¿Quedan cromos<br/>en este juego?}
    H -- sí --> D
    H -- no --> B
    D -. abres un juego .-> P[[PAUSA]]
    P -. lo cierras .-> B
```

> [!NOTE]
> **Sobre la velocidad:** Steam decide en sus servidores cuándo cae cada cromo, más o menos uno cada 20-30 minutos de juego y solo de un juego a la vez. **Ningún programa puede hacer que caigan más rápido.** Lo que hace SteamBandage es no perder tiempo: nunca deja un juego sin cromos ocupando el turno, nunca farmea en solo un juego que todavía no suelta cromos, y retoma en cuanto puede. En la práctica son unos **2-3 cromos por hora**.

<details>
<summary><b>¿Cómo se calcula la cuenta regresiva del anillo?</b></summary>
<br>

Steam no expone cuánto falta para el próximo cromo. SteamBandage mide cuánto tardó cada cromo real en tu cuenta y usa la **mediana de los últimos 15**, descartando valores absurdos. Arranca con 30 minutos y se va afinando solo. Cuando se pasa del tiempo esperado, el anillo pulsa en rojo con **Inminente**.

- **Barrido giratorio:** la sesión con Steam está viva.
- **Pulso:** se está consultando a Steam en ese momento.
- **Ticks encendidos:** progreso dentro de la ventana estimada.

</details>

<p align="center"><img src="docs/divider.svg" width="420"></p>

## ✦ Instalación

> [!IMPORTANT]
> Necesitas **Node.js 20 o superior** y **Windows 10/11**.

```powershell
git clone https://github.com/tomikav/steambandage.git
cd steambandage
npm install
npm run dev
```

**Generar el instalador `.exe`:**

```powershell
npm run dist
```

El instalador queda en `release/`.

| Comando | Qué hace |
|:--|:--|
| `npm run dev` | Abre la app en modo desarrollo con recarga en caliente |
| `npm run build` | Compila la interfaz en `dist/` |
| `npm start` | Abre la app con la interfaz ya compilada |
| `npm test` | Simula Steam completo y prueba el algoritmo |
| `npm run dist` | Genera el instalador de Windows |

<p align="center"><img src="docs/divider.svg" width="420"></p>

## ✦ Iniciar sesión

<table>
<tr>
<td width="55%" valign="top">

1. Abre SteamBandage. Si tienes Steam instalado, **detecta tu cuenta** automáticamente.
2. En la **app de Steam** de tu celular, ve a **Steam Guard** y toca el ícono de escanear.
3. Apunta al código y toca **Aprobar**. Listo.

La próxima vez entra sola. Para quitarle el acceso, revócalo desde la app de Steam en **Dispositivos autorizados**.

¿No tienes la app móvil? Abajo del QR está **Entrar con contraseña**, que también soporta los códigos de Steam Guard por correo.

</td>
<td width="45%" valign="top">

> [!TIP]
> **¿Por qué es seguro?**
> - El QR es el mismo sistema que usa Steam en el navegador.
> - La contraseña nunca pasa por la app.
> - Solo se guarda un token cifrado con DPAPI de Windows.
> - De tu PC solo se lee el nombre y el avatar de la cuenta (`loginusers.vdf`); nunca sesiones ni cookies.

</td>
</tr>
</table>

<p align="center"><img src="docs/divider.svg" width="420"></p>

## ✦ Ajustes

| Ajuste | Por defecto | Descripción |
|:--|:--:|:--|
| Horas antes de farmear solo | `2` | Horas mínimas para que Steam suelte cromos. `0` = siempre de a uno |
| Juegos a la vez | `32` | Cuántos juegos se calientan juntos (máximo de Steam) |
| Orden | Más cromos | `Más cromos` · `Más horas` · `Alfabético` |
| Empezar al abrir | ✓ | Arranca solo al iniciar sesión |
| Vender cromos nuevos | ✗ | Autoventa al mercado. **Requiere confirmar en la app móvil** |
| Precio | Más bajo − 1 centavo | O igual al precio más bajo |
| Mínimo a recibir | `0.00` | No lista por debajo de esto |

Para saltar un juego, usa la **×** en la cola. Con **↺** lo vuelves a incluir.

<p align="center"><img src="docs/divider.svg" width="420"></p>

## ✦ Estructura

```
steambandage/
├── electron/
│   ├── main.js            ventana, bandeja, IPC, notificaciones
│   ├── preload.js         API segura para la UI (contextIsolation)
│   ├── store.js           ajustes, estadísticas y token cifrado
│   └── steam/
│       ├── farmer.js      núcleo: login, algoritmo, pausas, drops
│       ├── qr.js          login con QR (steam-session)
│       ├── local.js       detecta la cuenta de Steam del PC
│       ├── badges.js      lee insignias y cromos restantes
│       └── market.js      autoventa y cálculo de comisiones
├── src/                   interfaz en React
│   ├── App.jsx
│   ├── components/        DropRing · Queue · Activity · Settings · Login
│   └── styles.css         tema vamp
├── test/                  simulación completa de Steam
└── docs/                  banner, capturas, ornamentos
```

<p align="center"><img src="docs/divider.svg" width="420"></p>

## ✦ Preguntas

<details>
<summary><b>¿Me pueden banear por usar esto?</b></summary>
<br>
Farmear cromos con idlers lleva años siendo tolerado por Steam (ArchiSteamFarm, Idle Master, etc.) y no afecta VAC, porque no se toca ningún juego. Aun así, es una herramienta no oficial: úsala bajo tu propio criterio.
</details>

<details>
<summary><b>¿Por qué no puedo conectarme solo con mi SteamID?</b></summary>
<br>
Para que Steam cuente horas y suelte cromos, la cuenta tiene que tener una sesión iniciada. Con el SteamID solo se ve información pública, y ni siquiera cuántos cromos te quedan. Por eso SteamBandage usa el login con QR: tú lo apruebas desde tu celular sin escribir la contraseña en ningún lado.
</details>

<details>
<summary><b>¿Puedo jugar mientras farmeo?</b></summary>
<br>
Sí. Steam solo permite una sesión jugando por cuenta. Cuando abres un juego, Steam te avisa que la cuenta está en uso en otro equipo. Le das a <b>continuar</b> y SteamBandage se pausa solo. Al cerrar el juego, retoma.
</details>

<details>
<summary><b>¿Por qué no caen cromos en el calentamiento?</b></summary>
<br>
En muchas cuentas Steam no suelta cromos hasta que el juego tiene unas 2 horas jugadas. El calentamiento suma esas horas a varios juegos a la vez para que después caigan en el modo solo. Si tu cuenta no tiene esa restricción, pon el umbral en <code>0</code>.
</details>

<details>
<summary><b>¿Dónde se guardan mis datos?</b></summary>
<br>
En <code>%APPDATA%\steambandage</code>: <code>settings.json</code>, <code>stats.json</code> y <code>session.bin</code> (el token cifrado). Al cerrar sesión desde la app, el token se borra.
</details>

<details>
<summary><b>La autoventa listó cromos pero no aparecen en el mercado</b></summary>
<br>
Steam exige confirmar cada listado. Abre la app móvil de Steam → Confirmaciones y apruébalos.
</details>

<details>
<summary><b>Sale "No pude leer tus insignias"</b></summary>
<br>
Tu perfil o tus detalles de juego deben ser visibles para tu propia sesión. Si persiste, cierra sesión y vuelve a entrar para renovar la sesión web.
</details>

<p align="center"><img src="docs/divider.svg" width="420"></p>

## ✦ Hoja de ruta

- [x] Login con QR y detección de la cuenta del PC
- [x] Farmeo en 2 fases con pausa automática
- [x] Indicador de drop que aprende de tu cuenta
- [x] Autoventa opcional
- [x] Simulación de Steam para tests
- [ ] Varias cuentas a la vez
- [ ] Prioridad por precio de los cromos
- [ ] Historial de cromos por día
- [ ] Inicio automático con Windows

<br>

<p align="center">
  <img src="docs/divider.svg" width="300"><br>
  <sub>Hecho por <a href="https://github.com/tomikav">tomikav</a> · Electron · React · <a href="https://github.com/DoctorMcKay/node-steam-user">steam-user</a> · <a href="https://github.com/DoctorMcKay/node-steamcommunity">steamcommunity</a></sub><br>
  <sub><i>No está afiliado a Valve ni a Steam.</i></sub>
</p>
