import {
  EditorService,
  EventEmitter,
  FileSystemService,
  LspService,
  WorkbenchService
} from '@ridit/editor-services/browser'

function init(): void {
  window.addEventListener('DOMContentLoaded', async () => {
    const eventEmitter = new EventEmitter()

    const lspService = new LspService(eventEmitter, {
      disableInBuiltTypescriptWorker: true,
      defaultWorkspaceFolder: 'E:\\projects\\editor\\examples\\electron'
    })

    const fileSystem = new FileSystemService(eventEmitter, window, {
      mode: 'virtual',
      name: 'MyVirtualSystem'
    })

    fileSystem.writeFile(
      'E:\\projects\\editor\\examples\\electron\\src\\renderer\\src\\renderer.py',
      "print('Hello World!!!!')"
    )

    const editorService = new EditorService(eventEmitter, {
      LspService: lspService,
      fileSystem,
      editorConfig: {
        fontSize: 24
      }
    })
    const workbenchService = new WorkbenchService(eventEmitter, {
      editorService,
      config: {
        fontSize: {
          size: 18,
          applyGlobally: true
        },
        fontFamily: 'monospace'
      }
    })

    workbenchService.mount(document, window)

    const model = await editorService.create_model(
      'E:\\projects\\editor\\examples\\electron\\src\\renderer\\src\\renderer.py'
    )
    await editorService.set_model_active(model.uri)
  })
}

init()
