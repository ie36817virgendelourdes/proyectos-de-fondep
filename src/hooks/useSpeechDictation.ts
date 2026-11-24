import {useCallback, useEffect, useRef, useState} from 'react';

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
}

interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
}

interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function useSpeechDictation(options: {
  onFinalTranscript: (targetId: string, text: string) => void;
  onNotify: (msg: string) => void;
}) {
  const {onFinalTranscript, onNotify} = options;
  const [activeTargetId, setActiveTargetId] = useState<string | null>(null);
  const [interimText, setInterimText] = useState<string>('');
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const activeTargetRef = useRef<string | null>(null);
  const onFinalRef = useRef(onFinalTranscript);
  const onNotifyRef = useRef(onNotify);

  onFinalRef.current = onFinalTranscript;
  onNotifyRef.current = onNotify;

  const isSupported = typeof window !== 'undefined' && getSpeechRecognitionConstructor() !== null;

  const stopDictation = useCallback(() => {
    activeTargetRef.current = null;
    setActiveTargetId(null);
    setInterimText('');
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch {
        // ignore already stopped
      }
      recognitionRef.current = null;
    }
  }, []);

  const startDictation = useCallback(
    (targetId: string) => {
      const Recognition = getSpeechRecognitionConstructor();
      if (!Recognition) {
        onNotifyRef.current(
          'Este navegador no soporta dictado web directo. Puedes usar el micrófono del teclado de tu móvil.'
        );
        return false;
      }

      if (activeTargetRef.current === targetId) {
        stopDictation();
        onNotifyRef.current('Dictado detenido.');
        return false;
      }

      stopDictation();

      try {
        const rec = new Recognition();
        rec.lang = 'es-PE';
        rec.continuous = true;
        rec.interimResults = true;

        activeTargetRef.current = targetId;
        setActiveTargetId(targetId);
        setInterimText('');

        rec.onresult = (event: SpeechRecognitionEventLike) => {
          let finalChunk = '';
          let interimChunk = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const res = event.results[i];
            const transcript = res[0]?.transcript || '';
            if (res.isFinal) {
              finalChunk += transcript;
            } else {
              interimChunk += transcript;
            }
          }

          setInterimText(interimChunk.trim());

          if (finalChunk.trim() && activeTargetRef.current) {
            onFinalRef.current(activeTargetRef.current, finalChunk.trim());
          }
        };

        rec.onerror = (event: SpeechRecognitionErrorEventLike) => {
          if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            onNotifyRef.current(
              'Permiso de micrófono denegado. Habilítalo en tu navegador o usa el micrófono del teclado.'
            );
          } else if (event.error === 'no-speech') {
            onNotifyRef.current('No se detectó voz. Intenta hablar más cerca del micrófono.');
          } else if (event.error !== 'aborted') {
            onNotifyRef.current(`Dictado interrumpido (${event.error}).`);
          }
          stopDictation();
        };

        rec.onend = () => {
          if (activeTargetRef.current === targetId) {
            stopDictation();
          }
        };

        recognitionRef.current = rec;
        rec.start();
        onNotifyRef.current('Micrófono activo. Dicta tu texto en español y pulsa Detener al finalizar.');
        return true;
      } catch {
        stopDictation();
        onNotifyRef.current('No se pudo iniciar el micrófono en este dispositivo.');
        return false;
      }
    },
    [stopDictation]
  );

  useEffect(() => {
    return () => {
      stopDictation();
    };
  }, [stopDictation]);

  return {
    isSupported,
    activeTargetId,
    interimText,
    startDictation,
    stopDictation,
  };
}
