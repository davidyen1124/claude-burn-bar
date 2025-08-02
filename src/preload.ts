import { contextBridge } from 'electron'

// Since this is a menubar app with no renderer window,
// this preload script is minimal. If you add a preferences
// window or other UI, you would expose safe APIs here.

// Example of how to safely expose APIs if needed:
contextBridge.exposeInMainWorld('electronAPI', {
  // Add any APIs you need to expose to renderer processes here
  // For example:
  // getVersion: () => process.versions.electron
})
