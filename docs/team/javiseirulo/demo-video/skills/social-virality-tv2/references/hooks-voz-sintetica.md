# Hooks para voz sintética y pantalla (TV-2)

Cómo usar la `hook-library.md` de la madre (1000 hooks en español, organizados en 16 categorías; el SKILL.md de la madre dice 15 mecanismos, pero el índice de la librería lista 16 categorías que suman los 1000: manda el índice) cuando el vídeo lo narra una voz sintética fija y el texto llega antes de 0,5 s. No reemplaza la guía de hooks de la madre: la especializa para TV-2.

## El hook en TV-2: texto siempre, voz si hay narración

En TV-2 el hook llega por dos canales, pero solo el primero es universal:

1. **Texto en pantalla antes de 0,5 s, siempre** (regla del pipeline, con voz o sin ella). Es lo que para el scroll con el sonido apagado.
2. **Primera frase hablada en el segundo 0, solo si la pieza lleva narración** (como en ocho de las nueve referencias del proyecto). Las piezas de texto sin voz (muchos formatos ✅) no tienen este canal: su hook es solo el texto, al ritmo de la música.

Cuando hay los dos, dicen lo mismo de formas distintas: el texto es la versión comprimida; la voz, la versión con tensión. Nunca son idénticos palabra a palabra (para eso están los subtítulos karaoke).

## Restricciones de la voz que cambian la elección del hook

- **Frases habladas cortas**: la guía TV-2 del repo sugiere menos de unas 9 palabras por frase (pauta del pipeline, no del corpus ni un umbral universal de narración). Los hooks largos de la librería se parten (primera mitad hablada, segunda en pantalla o en la frase siguiente) o se elige otro.
- La voz sintética no aporta carisma ni énfasis dramático: el interés tiene que estar en las **palabras**, no en la entrega. Los hooks que en el corpus funcionan "por el tono" (varios de Opinion y Storytelling) necesitan escritura más afilada: número, negación, contraste concreto.
- Ritmo medido en las referencias del proyecto: 133-236 palabras/minuto en español (mediana ~190; medición, no norma). Un hook de unas 8 palabras ocupa del orden de 2-3,6 s a ese ritmo, la ventana del primer beat. La cifra operativa sale de la primera locución de prueba de Chatterbox.
- Los números del hook tienen que ser reales y con fuente (`facts.md`). La librería trae números de ejemplo de otros creadores: no se reutilizan.

## Los 16 mecanismos de la librería en TV-2

| Mecanismo (tamaño) | Uso en TV-2 |
|---|---|
| Revelación personal y reframe (409) | El más grande y el más útil: "esto es lo que X me enseñó". Encaja con Advice y Storytelling. Cuidado: la "revelación personal" de una voz sintética tiene que ser de Javi (su experiencia real, declarada como narrada por IA) o convertirse en reframe impersonal. |
| Validación emocional (121) | "Nadie entiende...": perfecto para Relatable como texto en pantalla; en voz puede sonar plano, mejor texto + música. |
| Utilidad directa (88) | "Cómo hacer X": encaja con Advice y con los explicadores (mecanismo/concepto). El número de pasos en el hook ordena las escenas. |
| Afirmación directa / opinión (81) | El canal natural de Opinion: declaración en pantalla grande, voz que la matiza. |
| Contrarian / rompe creencia (79) | Muy fuerte en pantalla (Opinion, "Panel de datos"). La creencia rota se muestra primero y se rompe visualmente. |
| Lista, número o cantidad (59) | Directo: el número del hook es la cuenta de beats. |
| Curiosidad y misterio (49) | Funciona, pero la madre prohíbe pagos que decepcionan: el misterio se paga antes del 60-70 % y abre otro bucle. |
| Pregunta al espectador (27) | El mejor mecanismo para piezas sin voz (texto + música) y para CTA de comentarios (Relatable #03). |
| Error y lección cara (24) | Encaja con Storytelling y Advice de arrepentimiento (#03, #21, #22). |
| Condicional prescriptivo (18) | "Si quieres X...": apertura de listas de utilidad. |
| Urgencia y tiempo (14) | Con reloj o cuenta atrás visual ("Viaje nocturno", Storytelling #03). La urgencia tiene que ser real, nunca falsa escasez (regla de la madre). |
| Identidad y audiencia concreta (10) | "Si tienes 19-22 y...": encaja con la regla C1 de hablar a una persona concreta. |
| Comparación y contraste (8) | Split screen o antes/después dibujado (Advice #06, Opinion #17). |
| Superlativo (8) | Solo con prueba real; la madre prohíbe absolutos sin soporte. |
| Resultado y prueba (4) | El más escaso y el más exigente: prueba visible en pantalla, jamás inventada. |
| Historia personal y confesión (1) | Igual que revelación personal: solo experiencia real de Javi, declarada. |

## Procedimiento

1. Elige el formato en el catálogo de la madre; su "hook pattern" fija el mecanismo.
2. Busca en la librería 3-5 hooks de ese mecanismo (la madre pide 5 hooks con tradeoffs; anota el número de librería de los adaptados).
3. Reescribe cada hook en su doble versión: texto en pantalla (lo legible en unos 2 s) y primera frase hablada corta (la pauta del repo: menos de unas 9 palabras).
4. Descarta el que prometa lo que el cuerpo no paga (regla de la madre) y el que dependa de entrega dramática.
5. Comprueba números y afirmaciones contra `facts.md`.
