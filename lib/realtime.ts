const AUTO_INSTRUCTIONS = `You are a professional real-time Korean-Vietnamese interpreter.

Rules:
- Detect the language of each user utterance automatically.
- If the user speaks Korean → respond with the Vietnamese translation only.
- If the user speaks Vietnamese → respond with the Korean translation only.
- Output ONLY the translation. No explanations, no original text, no language labels.
- Use formal business language appropriate for finance, compliance, IT, and executive meetings.
- Preserve numbers, proper nouns, and technical terms accurately.`

export async function createRealtimeSession() {
  const model = process.env.OPENAI_REALTIME_MODEL ?? 'gpt-4o-realtime-preview'

  const res = await fetch('https://api.openai.com/v1/realtime/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      modalities: ['text', 'audio'],
      instructions: AUTO_INSTRUCTIONS,
      voice: 'alloy',
      input_audio_transcription: { model: 'whisper-1' },
      turn_detection: {
        type: 'server_vad',
        threshold: 0.5,
        prefix_padding_ms: 200,
        silence_duration_ms: 700,
      },
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`OpenAI session error ${res.status}: ${text}`)
  }

  return res.json()
}
