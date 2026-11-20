# SteamBandage ✦

Farmeador de cromos de Steam con una UI vamp minimalista. Inicia sesión como un cliente de Steam aparte y reporta que estás "jugando" sin abrir ningún juego, así que no gasta CPU ni GPU.

## Cómo farmea

Steam decide en sus servidores cuándo cae un cromo: más o menos 1 cada 20-30 min de juego, un juego a la vez. Ningún programa puede hacer que caigan más rápido. Lo que hace SteamBandage es **no perder ni un minuto**:

1. **Solo:** los juegos con ≥ 2 h jugadas se farmean de uno en uno (ahí es donde caen los cromos).
2. **Calentamiento:** si ninguno llega a las 2 h, pone hasta 32 a la vez para sumarles horas, y después los pasa a solo.
3. Cuando cae un cromo (aviso `newItems` de Steam, o un check cada 5 min), pasa al siguiente juego en cuanto se acaban los cromos del actual.

## Jugar mientras farmeas

Steam solo deja **una sesión jugando** por cuenta. Cuando abres un juego, el cliente te avisa que la cuenta está en uso en otro equipo; le das a continuar y SteamBandage **se pausa solo**. Cuando cierras el juego, retoma. Si el juego que abriste tiene cromos pendientes, esos también caen.

## Indicador de drop

El anillo muestra la ventana estimada para el próximo cromo. La estimación se calcula con la mediana de los intervalos reales que ha medido en tu cuenta (30 min por defecto). Steam no expone el temporizador, así que es una estimación que se va afinando sola. El barrido giratorio indica que la sesión está viva, y el pulso aparece mientras consulta a Steam.

## Autoventa (opcional, apagada por defecto)

Lista los cromos nuevos en el mercado: 1 centavo menos que el precio más bajo, o igual a ese precio, con un mínimo configurable. **Hay que confirmar los listados en la app móvil de Steam.**

## Uso

```bash
npm install
npm run dev      # desarrollo
npm run dist     # instalador .exe en /release
```

La contraseña va directo a Steam. Solo se guarda un refresh token cifrado con `safeStorage` (DPAPI en Windows).

## Stack

Electron · React · Vite · [steam-user](https://github.com/DoctorMcKay/node-steam-user) · [steamcommunity](https://github.com/DoctorMcKay/node-steamcommunity) · cheerio
