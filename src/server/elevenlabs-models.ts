// Commiting this list to code right now, unlikely to change soon.
// curl -X 'GET' \
//   'https://api.elevenlabs.io/v1/models' \
//   --header 'accept: application/json' \
//   --header 'xi-api-key: API_KEY_HERE'

export const ELEVENLABS_MODELS = [
  {
    model_id: "eleven_monolingual_v1",
    name: "Eleven Monolingual v1",
    can_be_finetuned: true,
    can_do_text_to_speech: true,
    can_do_voice_conversion: false,
    token_cost_factor: 1.0,
    description:
      "Use our standard English language model to generate speech in a variety of voices, styles and moods.",
    languages: [{ language_id: "en", name: "English" }],
  },
  {
    model_id: "eleven_multilingual_v1",
    name: "Eleven Multilingual v1",
    can_be_finetuned: true,
    can_do_text_to_speech: true,
    can_do_voice_conversion: true,
    token_cost_factor: 1.0,
    description:
      "Generate lifelike speech in multiple languages and create content that resonates with a broader audience. ",
    languages: [
      { language_id: "en", name: "English" },
      { language_id: "de", name: "German" },
      { language_id: "pl", name: "Polish" },
      { language_id: "es", name: "Spanish" },
      { language_id: "it", name: "Italian" },
      { language_id: "fr", name: "French" },
      { language_id: "pt", name: "Portuguese" },
      { language_id: "hi", name: "Hindi" },
    ],
  },
];
