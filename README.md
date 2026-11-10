# Hordas del Vacío

Juego de **supervivencia por oleadas** para navegador, Windows y celulares.
Tus armas disparan solas: tú te mueves, esquivas, eliges mejoras y derrotas a los jefes.

## De qué trata

- **Objetivo:** sobrevivir **30 oleadas** de 30 segundos. Cada 5 oleadas aparece un **jefe** y la oleada no avanza hasta derrotarlo. Si vences al jefe final, ganas la partida.
- **Dentro de cada partida:** juntas experiencia, subes de nivel y eliges 1 de 3 mejoras. Puedes llevar hasta 4 armas (nivel máximo 5) y 4 mejoras pasivas, así que cada partida sale distinta.
- **Entre partidas:** ganas fragmentos ◆ para el **Laboratorio** (14 mejoras permanentes), desbloqueas **6 pilotos** y **3 mapas**, completas **29 logros** y subes el nivel de **Peligro** (del 0 al 10).

### Contenido
| | |
|---|---|
| Armas | Bláster, Orbes guardianes, Rayo en cadena, Nova, Misiles buscadores, Cuchillas bumerán |
| Pasivas | Poder, Cadencia, Velocidad, Vida, Blindaje, Imán, Regeneración, Área, Crítico |
| Enemigos | Rastrero, Veloz, Bruto, Tirador, Divisor, Kamikaze |
| Jefes | El Coloso (embiste e invoca), La Tejedora (espirales de balas), El Ojo del Vacío (se teletransporta y lanza anillos) |
| Mapas | El Vacío, Bosque de Cristal, La Fundición |

### Opciones configurables
- **Video:** pantalla completa, escala de resolución, límite de FPS, contador de FPS, partículas, temblor de pantalla, zoom de cámara, destellos, números de daño y barras de vida.
- **Audio:** volumen general, de música y de efectos; elegir entre 4 pistas, automática o apagada; música especial en jefes; silenciar al minimizar.
- **Controles:** todas las teclas reasignables (2 por acción), apuntado automático o con ratón, mando y joystick táctil.
- **Juego:** pausa automática, temporizador, flecha hacia el jefe, modo daltónico y tamaño de la interfaz.
- **Apariencia:** color y forma de la nave, y estela.

La música y los efectos se generan por código con Web Audio, así que el juego no usa archivos de audio y pesa menos de 100 KB.

## Controles
| Acción | Teclado | Mando | Táctil |
|---|---|---|---|
| Moverse | WASD / flechas | Stick izquierdo / cruceta | Arrastrar en la mitad izquierda |
| Impulso | Espacio / Shift | A / RB | Tocar la mitad derecha |
| Pausa | Esc / P | Start | Botón ❚❚ |
| Elegir mejora | 1, 2, 3 | — | Tocar la carta |
| Relanzar mejoras | R | — | Botón |
| Cambiar música | M | — | — |

## Jugar en tu PC

**Opción 1, el .exe:** descarga `HordasDelVacio-x.y.z.exe` desde *Releases* y ábrelo. No necesita instalación.

**Opción 2, desde el código:** necesitas [Node.js](https://nodejs.org).
```bash
npm run web        # abre http://localhost:8080 en el navegador
npm install        # solo la primera vez, para el .exe
npm start          # abre el juego en su propia ventana
npm run exe        # crea dist/HordasDelVacio-x.y.z.exe
npm run zip-web    # crea dist/hordas-del-vacio-web.zip para portales web
```

## Publicar
- **GitHub Pages:** el flujo `.github/workflows/pages.yml` publica el juego en cada push a `main`. Hay que activarlo una vez en *Settings → Pages → Source: GitHub Actions*.
- **itch.io:** crea un proyecto de tipo *HTML*, sube `dist/hordas-del-vacio-web.zip` y marca *This file will be played in the browser*. También puedes subir el `.exe` como descarga para Windows.
- **minijuegos.com / juegos.com:** aceptan juegos HTML5; se envía el mismo `.zip` desde su portal para desarrolladores.
- **Steam:** necesita cuenta de Steamworks (pago único de 100 USD por juego). Se sube la versión de escritorio (Electron).
- **Play Store:** necesita cuenta de desarrollador de Google (25 USD). El juego web se puede empaquetar como app con Capacitor. El juego ya trae controles táctiles.

## Estructura
```
index.html          página del juego
css/style.css       estilos de los menús
js/config.js        opciones y guardado (localStorage)
js/data.js          armas, enemigos, jefes, mapas, mejoras y logros (aquí se ajusta el balance)
js/audio.js         música y sonidos sintetizados
js/input.js         teclado, ratón, mando y táctil
js/game.js          lógica de la partida y dibujo
js/ui.js            menús
js/main.js          arranque y bucle principal
electron/main.js    ventana de escritorio para el .exe
tools/              servidor local y empaquetado web
```

## Ideas para el futuro
- Misiones diarias y semanales
- Evoluciones de armas (combinar arma nivel 5 + pasiva)
- Más jefes, mapas con obstáculos y eventos
- Tabla de récords en línea
- Traducción al inglés
- Gráficos y sonidos hechos a mano
