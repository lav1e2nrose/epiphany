export interface SpeechRecognitionHandle {
  start: () => void
  stop: () => void
}

type WebkitSpeechRecognitionConstructor = new () => {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: ((event: { error: string }) => void) | null
  start: () => void
  stop: () => void
}

export function createSpeechRecognition(
  language: string,
  onText: (text: string) => void,
  onError: (message: string) => void,
): SpeechRecognitionHandle {
  const ctor = (window as Window & { webkitSpeechRecognition?: WebkitSpeechRecognitionConstructor }).webkitSpeechRecognition
  if (!ctor) {
    return {
      start: () => onError('当前环境不支持语音识别，已回退为文字输入。'),
      stop: () => undefined,
    }
  }

  const instance = new ctor()
  instance.lang = language
  instance.continuous = false
  instance.interimResults = false
  instance.onresult = (event) => {
    const transcript = event.results[0]?.[0]?.transcript?.trim()
    if (transcript) onText(transcript)
  }
  instance.onerror = (event) => {
    onError(`语音识别失败：${event.error}`)
  }

  return {
    start: () => instance.start(),
    stop: () => instance.stop(),
  }
}
