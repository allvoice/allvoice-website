type PreviewText = {
  emoji: string;
  text: string;
};

const HAPPY_PREVIEW_TEXT: PreviewText = {
  emoji: "😁",
  text: "Guess what? We've won the lottery of smiles today! Let's embrace this joy, spreading it around like sunshine on a cloudless day.",
};

const SAD_PREVIEW_TEXT: PreviewText = {
  emoji: "😭",
  text: "Feels like a heavy cloud is hanging over us today. The once vibrant roses now bow their heads, echoing the melancholy in our hearts.",
};

const NEUTRAL_PREVIEW_TEXT: PreviewText = {
  emoji: "😐",
  text: "Just another typical day - the ticking of the clock, pages of a book turning, the predictable hum of the city outside. A portrait of life in its routine form.",
};

export const PREVIEW_TEXTS: PreviewText[] = [
  HAPPY_PREVIEW_TEXT,
  SAD_PREVIEW_TEXT,
  NEUTRAL_PREVIEW_TEXT,
];
