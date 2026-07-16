interface PersonalizeCardTextOptions {
  text: string;
  actorName: string;
  targetName?: string | null;
  actorIsBoth?: boolean;
  hasExplicitTarget?: boolean;
}

interface Replacement {
  pattern: RegExp;
  replace: (target: string) => string;
}

const replacements: Replacement[] = [
  {
    pattern: /\bentre nosotros\b/gi,
    replace: (target) => `entre vos y ${target}`,
  },
  {
    pattern: /\bmi primer beso\b/gi,
    replace: (target) => `el primer beso de ${target}`,
  },
  {
    pattern: /\bmi cuerpo\b/gi,
    replace: (target) => `el cuerpo de ${target}`,
  },
  {
    pattern: /\bmi boca\b/gi,
    replace: (target) => `la boca de ${target}`,
  },
  {
    pattern: /\bmi pija\b/gi,
    replace: (target) => `la pija de ${target}`,
  },
  {
    pattern: /\bmi concha\b/gi,
    replace: (target) => `la concha de ${target}`,
  },
  {
    pattern: /\bmi clítoris\b/gi,
    replace: (target) => `el clítoris de ${target}`,
  },
  {
    pattern: /\bmi entrepierna\b/gi,
    replace: (target) => `la entrepierna de ${target}`,
  },
  {
    pattern: /\bmi cuello\b/gi,
    replace: (target) => `el cuello de ${target}`,
  },
  {
    pattern: /\bmi oído\b/gi,
    replace: (target) => `el oído de ${target}`,
  },
  {
    pattern: /\bmi cintura\b/gi,
    replace: (target) => `la cintura de ${target}`,
  },
  {
    pattern: /\bmi espalda\b/gi,
    replace: (target) => `la espalda de ${target}`,
  },
  {
    pattern: /\bmi falda\b/gi,
    replace: (target) => `la falda de ${target}`,
  },
  {
    pattern: /\bmi mirada\b/gi,
    replace: (target) => `la mirada de ${target}`,
  },
  {
    pattern: /\bmi mano\b/gi,
    replace: (target) => `la mano de ${target}`,
  },
  {
    pattern: /\bmis dedos\b/gi,
    replace: (target) => `los dedos de ${target}`,
  },
  {
    pattern: /\bmis huevos\b/gi,
    replace: (target) => `los huevos de ${target}`,
  },
  {
    pattern: /\bmis partes íntimas\b/gi,
    replace: (target) => `las partes íntimas de ${target}`,
  },
  {
    pattern: /\bpara mí\b/gi,
    replace: (target) => `para ${target}`,
  },
  {
    pattern: /\bfrente a mí\b/gi,
    replace: (target) => `frente a ${target}`,
  },
  {
    pattern: /\bacercate a mí\b/gi,
    replace: (target) => `acercate a ${target}`,
  },
  {
    pattern: /\bsobre mí\b/gi,
    replace: (target) => `sobre ${target}`,
  },
  {
    pattern: /\bcontra mí\b/gi,
    replace: (target) => `contra ${target}`,
  },
  {
    pattern: /\bconmigo\b/gi,
    replace: (target) => `con ${target}`,
  },
  {
    pattern: /\bnuestro momento\b/gi,
    replace: () => 'un momento de ustedes',
  },
  {
    pattern: /\bmomento nuestro\b/gi,
    replace: () => 'momento de ustedes',
  },
  {
    pattern: /\bimagen nuestra\b/gi,
    replace: () => 'imagen de ustedes',
  },
  {
    pattern: /\bMirame\b/gi,
    replace: (target) => `Mirá a ${target}`,
  },
  {
    pattern: /\bSusurrame\b/gi,
    replace: (target) => `Susurrale a ${target}`,
  },
  {
    pattern: /\bDame\b/gi,
    replace: (target) => `Dale a ${target}`,
  },
  {
    pattern: /\bDecime\b/gi,
    replace: (target) => `Decile a ${target}`,
  },
  {
    pattern: /\bMostrame\b/gi,
    replace: (target) => `Mostrale a ${target}`,
  },
  {
    pattern: /\bContame\b/gi,
    replace: (target) => `Contale a ${target}`,
  },
  {
    pattern: /\bPedime\b/gi,
    replace: (target) => `Pedile a ${target}`,
  },
  {
    pattern: /\bHablame\b/gi,
    replace: (target) => `Hablale a ${target}`,
  },
  {
    pattern: /\bBesame\b/gi,
    replace: (target) => `Besá a ${target}`,
  },
  {
    pattern: /\bTocame\b/gi,
    replace: (target) => `Tocá a ${target}`,
  },
  {
    pattern: /\bAcariciame\b/gi,
    replace: (target) => `Acariciá a ${target}`,
  },
  {
    pattern: /\bAbrazame\b/gi,
    replace: (target) => `Abrazá a ${target}`,
  },
  {
    pattern: /\bProvocame\b/gi,
    replace: (target) => `Provocá a ${target}`,
  },
  {
    pattern: /\bApretame\b/gi,
    replace: (target) => `Apretá a ${target}`,
  },
  {
    pattern: /\bMasajeame\b/gi,
    replace: (target) => `Masajeá a ${target}`,
  },
  {
    pattern: /\bDesvestime\b/gi,
    replace: (target) => `Desvestí a ${target}`,
  },
  {
    pattern: /\bAtame\b/gi,
    replace: (target) => `Atá a ${target}`,
  },
  {
    pattern: /\bPegame\b/gi,
    replace: (target) => `Pegá a ${target}`,
  },
  {
    pattern: /\bAgarrame\b/gi,
    replace: (target) => `Agarrá a ${target}`,
  },
  {
    pattern: /\bSosteneme\b/gi,
    replace: (target) => `Sostené a ${target}`,
  },
  {
    pattern: /\bAcostame\b/gi,
    replace: (target) => `Acostá a ${target}`,
  },
  {
    pattern: /\bAbrime\b/gi,
    replace: (target) => `Abrile a ${target}`,
  },
  {
    pattern: /\bPoneme\b/gi,
    replace: (target) => `Poné a ${target}`,
  },
  {
    pattern: /\bSacame\b/gi,
    replace: (target) => `Sacale a ${target}`,
  },
  {
    pattern: /\bLlename\b/gi,
    replace: (target) => `Llenale a ${target}`,
  },
  {
    pattern: /\bHaceme acabar\b/gi,
    replace: (target) => `Hacé acabar a ${target}`,
  },
  {
    pattern: /\bHaceme una paja\b/gi,
    replace: (target) => `Hacéle una paja a ${target}`,
  },
  {
    pattern: /\bChupame\s+(la|el|las|los)\s+/gi,
    replace: (target) => `Chupale $1 `,
  },
  {
    pattern: /\bcalentarme\b/gi,
    replace: (target) => `calentar a ${target}`,
  },
  {
    pattern: /\btocarme\b/gi,
    replace: (target) => `tocar a ${target}`,
  },
  {
    pattern: /\bhacerme acabar\b/gi,
    replace: (target) => `hacer acabar a ${target}`,
  },
  {
    pattern: /\bhacerme\b/gi,
    replace: (target) => `hacerle algo a ${target}`,
  },
  {
    pattern: /\bbesarme\b/gi,
    replace: (target) => `besar a ${target}`,
  },
  {
    pattern: /\bseducirme\b/gi,
    replace: (target) => `seducir a ${target}`,
  },
  {
    pattern: /\blevantarme\b/gi,
    replace: (target) => `levantar a ${target}`,
  },
  {
    pattern: /\bdesnudarme\b/gi,
    replace: (target) => `desnudar a ${target}`,
  },
  {
    pattern: /\bsacarme\b/gi,
    replace: (target) => `sacarle la ropa a ${target}`,
  },
  {
    pattern: /\bmostrarme\b/gi,
    replace: (target) => `mostrarle a ${target}`,
  },
  {
    pattern: /\bdejame\b/gi,
    replace: (target) => `dejá a ${target}`,
  },
  {
    pattern: /\bdejándome\b/gi,
    replace: (target) => `dejando a ${target}`,
  },
  {
    pattern: /\bdándome\b/gi,
    replace: (target) => `dándole a ${target}`,
  },
  {
    pattern: /\btu pareja\b/gi,
    replace: (target) => target,
  },
  {
    pattern: /\bla otra persona\b/gi,
    replace: (target) => target,
  },
];

function applyReplacement(
  source: string,
  replacement: Replacement,
  target: string,
): string {
  return source.replace(
    replacement.pattern,
    (...args: unknown[]) => {
      const matched = String(args[0]);
      const value = replacement.replace(target);

      if (value.includes('$1')) {
        const group = String(args[1] ?? '');
        return value.replace('$1', group);
      }

      if (
        matched.length > 0 &&
        matched[0] === matched[0].toLowerCase()
      ) {
        return (
          value.charAt(0).toLowerCase() +
          value.slice(1)
        );
      }

      return value;
    },
  );
}

function lowerSentenceStart(text: string): string {
  if (!text) return text;

  if (
    text.startsWith('¿') ||
    text.startsWith('¡') ||
    text.startsWith('"') ||
    text.startsWith('“')
  ) {
    return text;
  }

  return (
    text.charAt(0).toLowerCase() +
    text.slice(1)
  );
}

function cleanText(text: string): string {
  return text
    .replace(/\bde el\b/gi, 'del')
    .replace(/\ba el\b/gi, 'al')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.;!?])/g, '$1')
    .replace(/,\s*,/g, ',')
    .trim();
}

export function personalizeCardText({
  text,
  actorName,
  targetName,
  actorIsBoth = false,
  hasExplicitTarget = false,
}: PersonalizeCardTextOptions): string {
  const safeActor =
    actorName.trim() || 'Vos';

  const safeTarget =
    targetName?.trim() || null;

  let personalized = text
    .replaceAll('{{actor}}', safeActor)
    .replaceAll(
      '{{target}}',
      safeTarget || 'tu pareja',
    );

  if (safeTarget) {
    for (const replacement of replacements) {
      personalized = applyReplacement(
        personalized,
        replacement,
        safeTarget,
      );
    }

    personalized = personalized
      .replace(
        /\bque te hiciera\b/gi,
        `que ${safeTarget} te hiciera`,
      )
      .replace(
        /\bque te hable\b/gi,
        `que ${safeTarget} te hable`,
      )
      .replace(
        /\bque meta\b/gi,
        `que ${safeTarget} meta`,
      )
      .replace(
        /\bque juegue\b/gi,
        `que ${safeTarget} juegue`,
      )
      .replace(
        /\bque te coja\b/gi,
        `que ${safeTarget} te coja`,
      )
      .replace(
        /\bque te acabe\b/gi,
        `que ${safeTarget} te acabe`,
      )
      .replace(
        /\bque te diga\b/gi,
        `que ${safeTarget} te diga`,
      )
      .replace(
        /\b¿Qué hago\b/gi,
        `¿Qué hace ${safeTarget}`,
      )
      .replace(
        /\bcontarme\b/gi,
        `contarle a ${safeTarget}`,
      )
      .replace(
        /\bme mirás\b/gi,
        `mirás a ${safeTarget}`,
      )
      .replace(
        /\bme toque(?:s)?\b/gi,
        `toques a ${safeTarget}`,
      )
      .replace(
        /\bme tocás\b/gi,
        `tocás a ${safeTarget}`,
      )
      .replace(
        /\bme besás\b/gi,
        `besás a ${safeTarget}`,
      )
      .replace(
        /\bme sostenés\b/gi,
        `sostenés a ${safeTarget}`,
      )
      .replace(
        /\bme contás\b/gi,
        `le contás a ${safeTarget}`,
      )
      .replace(
        /\bme calienta\b/gi,
        `calienta a ${safeTarget}`,
      )
      .replace(
        /\bme tocarías\b/gi,
        `tocarías a ${safeTarget}`,
      )
      .replace(
        /\bme toco\b/gi,
        `${safeTarget} se toca`,
      );

    personalized = cleanText(personalized);

    if (
      hasExplicitTarget &&
      !personalized
        .toLocaleLowerCase('es')
        .includes(
          safeTarget.toLocaleLowerCase('es'),
        )
    ) {
      return `${safeActor} → ${safeTarget}: ${lowerSentenceStart(
        personalized,
      )}`;
    }
  }

  if (actorIsBoth) {
    return `${safeActor}, ${lowerSentenceStart(
      cleanText(personalized),
    )}`;
  }

  return `${safeActor}, ${lowerSentenceStart(
    cleanText(personalized),
  )}`;
}
