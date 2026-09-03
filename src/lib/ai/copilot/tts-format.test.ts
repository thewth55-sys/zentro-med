import { describe, expect, it } from "vitest";
import { stripForSpeech } from "./tts-format";

describe("stripForSpeech", () => {
  it("joins a bullet list into a natural spoken enumeration", () => {
    expect(stripForSpeech("Puedo ayudarte con:\n- citas\n- conversaciones de WhatsApp\n- pacientes")).toBe(
      "Puedo ayudarte con: citas, conversaciones de WhatsApp y pacientes.",
    );
  });

  it("handles a single-item bullet group without a dangling comma", () => {
    expect(stripForSpeech("Solo tengo esto:\n- una cita hoy")).toBe("Solo tengo esto: una cita hoy.");
  });

  it("strips markdown bold/italics/code markers", () => {
    expect(stripForSpeech("Tienes **3** citas hoy, la primera a las `9am`.")).toBe(
      "Tienes 3 citas hoy, la primera a las 9am.",
    );
  });

  it("strips emojis", () => {
    expect(stripForSpeech("Hecho ✅ agendé la cita 📅 para mañana")).toBe("Hecho agendé la cita para mañana.");
  });

  it("adds terminal punctuation to plain sentences that lack it", () => {
    expect(stripForSpeech("No hay citas pendientes hoy")).toBe("No hay citas pendientes hoy.");
  });

  it("does not double up punctuation that is already there", () => {
    expect(stripForSpeech("¿Qué necesitas?")).toBe("¿Qué necesitas?");
  });

  it("separates a header line from its bullet list as two flowing sentences", () => {
    expect(stripForSpeech("Resumen del día:\n- 3 citas\n- 2 conversaciones sin responder")).toBe(
      "Resumen del día: 3 citas y 2 conversaciones sin responder.",
    );
  });
});
