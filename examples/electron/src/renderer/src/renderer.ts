import { Workbench } from '@ridit/editor-services/workbench'

window.addEventListener('DOMContentLoaded', async () => {
  const workbench = await Workbench.createElectron({
    rootPath: 'E:\\projects\\editor\\examples\\web',
    lsp: { disableInBuiltTypescriptWorker: true },
    config: { fontSize: 18, fontFamily: 'monospace' },
    editorConfig: {
      fontSize: 20
    }
  })

  await workbench.mount(document, window)
})
