import { describe, expect, it } from "vitest";
import {
  messagesAreEquivalent,
  resolveGamePaceMessage,
} from "../utils/game-pace-message";

describe("mensaje de ritmo v2.13.4", () => {
  it("no muestra una copia exacta del texto de la carta", () => {
    const card = "Besale el cuello lentamente y recorré su cuerpo con las manos.";

    expect(
      resolveGamePaceMessage({
        hostMessage: card,
        cardText: card,
        phase: "build",
        strategy: "escalate",
      }),
    ).toBe("La intensidad empieza a subir.");
  });

  it("detecta copias aunque cambien mayúsculas y puntuación", () => {
    expect(
      messagesAreEquivalent(
        "¡Besale el cuello lentamente!",
        "besale el cuello lentamente.",
      ),
    ).toBe(true);
  });

  it("detecta una reformulación que repite casi toda la carta", () => {
    expect(
      messagesAreEquivalent(
        "Ahora besale el cuello lentamente y recorré su cuerpo con las manos.",
        "Besale el cuello lentamente y recorré su cuerpo con las manos.",
      ),
    ).toBe(true);
  });

  it("mantiene un mensaje de dirección realmente diferente", () => {
    expect(
      resolveGamePaceMessage({
        hostMessage: "La intensidad sube, pero todavía conviene sostener la escena.",
        cardText: "Besale el cuello durante treinta segundos.",
        phase: "intense",
        strategy: "continue_scene",
      }),
    ).toBe("La intensidad sube, pero todavía conviene sostener la escena.");
  });

  it("usa el estado de la partida cuando la IA no envía mensaje", () => {
    expect(
      resolveGamePaceMessage({
        hostMessage: " ",
        cardText: "Una carta cualquiera",
        phase: "closing",
        strategy: null,
      }),
    ).toBe("La partida se acerca al cierre.");
  });
});
