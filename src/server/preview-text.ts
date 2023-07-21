type PreviewText = {
  emoji: string;
  text: string;
};

const HAPPY_PREVIEW_TEXT: PreviewText = {
  emoji: "😁",
  text: "Happy happy happy! I'm so happy right now!",
};

const SAD_PREVIEW_TEXT: PreviewText = {
  emoji: "😭",
  text: "I'm so sad. It feels like a heavy cloud is hanging over me today.",
};

const NEUTRAL_PREVIEW_TEXT: PreviewText = {
  emoji: "😐",
  text: "I went to the store today and bought some chicken. It was fine.",
};

export const PREVIEW_TEXTS: PreviewText[] = [
  HAPPY_PREVIEW_TEXT,
  SAD_PREVIEW_TEXT,
  NEUTRAL_PREVIEW_TEXT,
];
