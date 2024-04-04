export const DEFAULT_REPLACE_DICT = {
  $b: "\n",
  $B: "\n",
  $n: "adventurer",
  $N: "Adventurer",
  $C: "Adventurer",
  $c: "adventurer",
  $R: "Traveler",
  $r: "traveler",
};
const firstCharToUpperCase = (str: string | undefined) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1) : str;

const renderGenderOptions = (text: string) => {
  const pattern = /\$[Gg]\s*([^:;]+?)\s*:\s*([^:;]+?)\s*;/g;
  const maleText = text.replace(pattern, "$1");
  const femaleText = text.replace(pattern, "$2");
  return { maleText, femaleText };
};

export const getFirstNSentences = (text: string, n: number) => {
  const regex = new RegExp(`(?:.*?[.!?](?:\\s|$)(?!.*\\))){1,${n}}`, "s");
  const match = text.match(regex);
  return match ? match[0].trim() : text;
};

export const renderWarcraftTemplate = (
  templateText: string,
  values: { race?: string; class?: string; name?: string } = {},
) => {
  const mergedReplaceDict = { ...DEFAULT_REPLACE_DICT };
  mergedReplaceDict.$r = values.race || DEFAULT_REPLACE_DICT.$r;
  mergedReplaceDict.$R =
    firstCharToUpperCase(values.race) || DEFAULT_REPLACE_DICT.$R;
  mergedReplaceDict.$c = values.class || DEFAULT_REPLACE_DICT.$c;
  mergedReplaceDict.$C =
    firstCharToUpperCase(values.class) || DEFAULT_REPLACE_DICT.$C;
  mergedReplaceDict.$n = values.name || DEFAULT_REPLACE_DICT.$n;
  mergedReplaceDict.$N =
    firstCharToUpperCase(values.name) || DEFAULT_REPLACE_DICT.$N;

  let cleanedText = templateText;

  for (const [k, v] of Object.entries(mergedReplaceDict)) {
    cleanedText = cleanedText.replaceAll(k, v);
  }

  cleanedText = cleanedText.replace(/<.*?>\s/g, "");

  if (/\$[Gg]/.test(cleanedText)) {
    const { maleText, femaleText } = renderGenderOptions(cleanedText);

    return {
      maleText: maleText,
      femaleText: femaleText,
    };
  }

  return {
    text: cleanedText,
  };
};


export const getGenderSpecificRenderedText = (renderedTexts: {
  text?: string;
  maleText?: string;
  femaleText?: string;
}) => {
  let renderedText = renderedTexts.text;
  let maleOnly = false;
  let femaleOnly = false;

  if (renderedTexts.maleText && renderedTexts.femaleText) {
    // If both male and female texts are present, randomly choose one
    if (Math.random() < 0.5) {
      renderedText = renderedTexts.maleText;
      maleOnly = true;
    } else {
      renderedText = renderedTexts.femaleText;
      femaleOnly = true;
    }
  } else if (renderedTexts.maleText) {
    renderedText = renderedTexts.maleText;
    maleOnly = true;
  } else if (renderedTexts.femaleText) {
    renderedText = renderedTexts.femaleText;
    femaleOnly = true;
  }
  
  return { renderedText: renderedText!, maleOnly, femaleOnly };
};