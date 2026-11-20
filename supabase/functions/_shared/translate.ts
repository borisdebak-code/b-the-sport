// Translation of foreign titles/summaries into Croatian.
// Languages readers understand without translation stay as they are.

export const NO_TRANSLATION = new Set(['hr', 'sr', 'bs', 'cnr']);

export function needsTranslation(lang: string): boolean {
  return !NO_TRANSLATION.has(lang);
}

export interface Translator {
  translate(texts: string[], sourceLang: string): Promise<string[]>;
}

// DeepL API (free plan endpoint when the key ends with ":fx").
export function deeplTranslator(apiKey: string, fetchImpl: typeof fetch = fetch): Translator {
  const host = apiKey.endsWith(':fx') ? 'https://api-free.deepl.com' : 'https://api.deepl.com';
  return {
    async translate(texts, sourceLang) {
      if (texts.length === 0) return [];
      const res = await fetchImpl(`${host}/v2/translate`, {
        method: 'POST',
        headers: { Authorization: `DeepL-Auth-Key ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: texts, source_lang: sourceLang.toUpperCase(), target_lang: 'HR' }),
      });
      if (!res.ok) throw new Error(`DeepL ${res.status}: ${await res.text()}`);
      const json = (await res.json()) as { translations: { text: string }[] };
      return json.translations.map((t) => t.text);
    },
  };
}

// Google Cloud Translation v2 (Basic) as an alternative provider.
export function googleTranslator(apiKey: string, fetchImpl: typeof fetch = fetch): Translator {
  return {
    async translate(texts, sourceLang) {
      if (texts.length === 0) return [];
      const res = await fetchImpl(`https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: texts, source: sourceLang, target: 'hr', format: 'text' }),
      });
      if (!res.ok) throw new Error(`Google Translate ${res.status}: ${await res.text()}`);
      const json = (await res.json()) as { data: { translations: { translatedText: string }[] } };
      return json.data.translations.map((t) => t.translatedText);
    },
  };
}

export function translatorFromEnv(get: (k: string) => string | undefined): Translator | null {
  const provider = (get('TRANSLATE_PROVIDER') ?? 'deepl').toLowerCase();
  if (provider === 'google' && get('GOOGLE_TRANSLATE_API_KEY')) return googleTranslator(get('GOOGLE_TRANSLATE_API_KEY')!);
  if (get('DEEPL_API_KEY')) return deeplTranslator(get('DEEPL_API_KEY')!);
  return null;
}
