import { describe, expect, it } from "vitest";
import { isWhisperHallucination } from "./transcribe-filter";

describe("isWhisperHallucination", () => {
  it("flags known Whisper caption-credit hallucinations", () => {
    expect(isWhisperHallucination("Subtítulos realizados por la comunidad de Amara.org")).toBe(true);
    expect(isWhisperHallucination("subtitles by the amara.org community")).toBe(true);
    expect(isWhisperHallucination("Gracias por ver el vídeo")).toBe(true);
    expect(isWhisperHallucination("¡Suscríbete!")).toBe(true);
  });

  it("does not flag real dictated CRM instructions", () => {
    expect(isWhisperHallucination("Agenda una consulta mañana para Laura García a las 11")).toBe(false);
    expect(isWhisperHallucination("¿Qué citas hay esta semana?")).toBe(false);
  });

  it("does not flag empty or whitespace-only text", () => {
    expect(isWhisperHallucination("")).toBe(false);
    expect(isWhisperHallucination("   ")).toBe(false);
  });
});
