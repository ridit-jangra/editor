import {
  EditorService,
  EventEmitter,
  FileSystemService,
  LspService,
  WorkbenchService,
  ExplorerService,
  StorageService
} from '@ridit/editor-services/browser'

function init(): void {
  window.addEventListener('DOMContentLoaded', async () => {
    const eventEmitter = new EventEmitter()

    const storageService = new StorageService()
    storageService.start(window, 'electron')

    const lspService = new LspService(eventEmitter, {
      disableInBuiltTypescriptWorker: true,
      defaultWorkspaceFolder: 'E:\\projects\\editor\\examples\\electron'
    })

    const fileSystem = new FileSystemService(eventEmitter, window, {
      mode: 'virtual',
      name: 'MyVirtualSystem'
    })

    await fileSystem.writeFile(
      'E:\\projects\\editor\\examples\\electron\\src\\renderer\\src\\renderer.py',
      "print('Hello Worldd asd asd asd!!!!')"
    )

    await fileSystem.writeFile(
      'E:\\projects\\editor\\examples\\electron\\src\\renderer\\src\\renderer.css',
      "print('Hello Worl asda sdasd asd!!!!')"
    )

    await fileSystem.writeFile(
      'E:\\projects\\editor\\examples\\electron\\src\\renderer\\src\\renderer.html',
      "print('Hello World! asdasdas da!!!')"
    )

    const explorerService = new ExplorerService(eventEmitter, {
      fileSystem: fileSystem,
      rootPath: 'E:\\projects\\editor\\examples\\electron',
      async onFileOpen(path) {
        const model = await editorService.create_model(path)
        await editorService.set_model_active(model.uri)
      }
    })

    const editorService = new EditorService(eventEmitter, {
      LspService: lspService,
      fileSystem,
      explorerService,
      storageService,
      editorConfig: {
        fontSize: 24
      }
    })

    const workbenchService = new WorkbenchService(eventEmitter, {
      editorService,
      explorerService,
      storageService,
      config: {
        fontSize: {
          size: 18,
          applyGlobally: true
        },
        fontFamily: 'monospace'
      }
    })

    await workbenchService.mount(document, window)

    const model = await editorService.create_model(
      'E:\\projects\\editor\\examples\\electron\\src\\renderer\\src\\renderer.py'
    )
    await editorService.set_model_active(model.uri)
  })
}

init()
