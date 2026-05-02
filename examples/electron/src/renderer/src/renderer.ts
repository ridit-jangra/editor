import {
  EditorService,
  EventEmitter,
  FileSystemService,
  LspService,
  WorkbenchService,
  ExplorerService,
  StorageService
} from '@ridit/editor-services/browser'
import { ThemeService } from '../../../../../packages/services/src/ThemeService'

function init(): void {
  window.addEventListener('DOMContentLoaded', async () => {
    const eventEmitter = new EventEmitter()

    const storageService = new StorageService(window, 'electron', 'mystore2')
    await storageService.start()

    const lspService = new LspService(eventEmitter, {
      disableInBuiltTypescriptWorker: true,
      defaultWorkspaceFolder: 'E:\\projects\\editor\\examples\\web'
    })

    const fileSystem = new FileSystemService(eventEmitter, window, {
      mode: 'real',
      name: 'MyVirtualSystem'
    })

    //     await fileSystem.writeFile(
    //       '/src/main.ts',
    //       `
    // function greet(name: string): string {
    //   return \`Hello, \${name}!\`
    // }

    // console.log(greet('World'))`
    //     )

    //     await fileSystem.writeFile(
    //       '/src/style.css',
    //       `/* CSS example */
    // .container {
    //   display: flex;
    //   padding: 1rem;
    //   background: #1a1f29;
    // }`
    //     )

    //     await fileSystem.writeFile(
    //       '/src/index.html',
    //       `<!-- HTML example -->
    // <!DOCTYPE html>
    // <html>
    //   <head>
    //     <title>My App</title>
    //   </head>
    //   <body>
    //     <div id="root"></div>
    //   </body>
    // </html>`
    //     )

    const explorerService = new ExplorerService(eventEmitter, {
      services: {
        fileSystem: fileSystem
      },
      rootPath: 'E:\\projects\\editor\\examples\\web'
    })

    const themeService = new ThemeService(eventEmitter)

    const editorService = new EditorService(eventEmitter, {
      services: {
        lspService,
        fileSystem,
        explorerService,
        themeService,
        storageService
      },
      editorConfig: {
        fontSize: 20
      },
      theme: 'Dark'
    })

    const workbenchService = new WorkbenchService(eventEmitter, {
      services: {
        editorService,
        explorerService,
        storageService,
        themeService
      },
      config: {
        fontSize: 18,
        fontFamily: 'monospace',
        activityBarDirection: 'horizontal'
      }
    })

    await workbenchService.mount(document, window)

    // await editorService.open('/src/index.html')
  })
}

init()
