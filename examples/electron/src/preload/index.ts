import { contextBridge, ipcRenderer } from 'electron'
import { PreloadService } from '@ridit/editor-services/preload'

console.log('hey!!')

const preloadService = new PreloadService()
preloadService.start(contextBridge, ipcRenderer)
