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
    await storageService.start(window, 'electron', 'mystore2')

    const lspService = new LspService(eventEmitter, {
      disableInBuiltTypescriptWorker: true,
      defaultWorkspaceFolder: '/src'
    })

    const fileSystem = new FileSystemService(eventEmitter, window, {
      mode: 'virtual',
      name: 'MyVirtualSystem'
    })

    await fileSystem.writeFile('/src/renderer.py', "print('Hello Worldd asd asd asd!!!!')")

    await fileSystem.writeFile('/src/renderer.css', "print('Hello Worl asda sdasd asd!!!!')")

    await fileSystem.writeFile('/src/renderer.html', "print('Hello World! asdasdas da!!!')")

    const explorerService = new ExplorerService(eventEmitter, {
      services: {
        fileSystem: fileSystem
      },
      rootPath: '/src'
    })

    const editorService = new EditorService(eventEmitter, {
      services: {
        LspService: lspService,
        fileSystem,
        explorerService,
        storageService
      },
      editorConfig: {
        fontSize: 24
      },
      theme: 'Dark'
    })

    const workbenchService = new WorkbenchService(eventEmitter, {
      services: {
        editorService,
        explorerService,
        storageService
      },
      config: {
        fontSize: {
          size: 18,
          applyGlobally: true
        },
        fontFamily: 'monospace'
      }
    })

    await workbenchService.mount(document, window)

    await editorService.open('/src/renderer.py')
  })
}

init()
