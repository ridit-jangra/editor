import { contextBridge, ipcRenderer } from 'electron'
import { PreloadService } from '@ridit/editor-services/preload'

const preloadService = new PreloadService()
preloadService.start(contextBridge, ipcRenderer)
