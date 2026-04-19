export function path_to_language(file_path: string, monaco: any) {
  const languages = monaco.languages.getLanguages();

  for (const lang of languages) {
    if (!lang.extensions) continue;

    for (const ext of lang.extensions) {
      if (file_path.endsWith(ext)) {
        return lang.id;
      }
    }
  }

  return "plaintext";
}
