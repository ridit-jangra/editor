import {
  EditorService,
  EventEmitter,
  LspService,
  VirtualFileSystemService
} from '@ridit/editor-services/browser'

function init(): void {
  window.addEventListener('DOMContentLoaded', () => {
    const eventEmitter = new EventEmitter()

    const lspService = new LspService(eventEmitter, {})

    const virtualFileSystem = new VirtualFileSystemService(eventEmitter, {
      name: 'MyVirtualFileSystem'
    })

    const editorService = new EditorService(eventEmitter, {
      LspService: lspService,
      domElement: '.editor',
      virtualFileSystem
    })

    editorService.start(window)
    editorService.mount(document)
  })
}

init()
