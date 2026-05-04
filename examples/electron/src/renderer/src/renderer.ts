import editor_worker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import json_worker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import css_worker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import html_worker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import ts_worker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'
import { Workbench } from '@ridit/editor-services/workbench'

window.addEventListener('DOMContentLoaded', async () => {
  const workbench = await Workbench.createElectron({
    rootPath: 'E:\\projects\\editor\\examples\\web',
    lsp: { disableInBuiltTypescriptWorker: true },
    config: { fontSize: 18, fontFamily: 'monospace' },
    editorConfig: {
      fontSize: 20
    },
    workerFactories: {
      editor: editor_worker,
      css: css_worker,
      html: html_worker,
      json: json_worker,
      typescript: ts_worker
    },
    ai: {
      enabled: true
    },
    theme: 'Dark'
  })

  await workbench.aiService!.createProvider({
    model: 'openai/gpt-oss-120b',
    provider: 'groq',
    apiKey: import.meta.env.VITE_API_KEY,
    default: true
  })

  await workbench.workbenchService.mount(document, window)
})
