import { ipcMain, BrowserWindow, IpcMainInvokeEvent } from 'electron'

// Security: IPC validation infrastructure
// This module provides secure IPC handling with sender validation

interface AllowedOrigin {
  protocol: string
  host: string
}

// Define allowed origins for IPC communication
const ALLOWED_ORIGINS: AllowedOrigin[] = [
  { protocol: 'app:', host: '' }, // Our custom protocol
  { protocol: 'file:', host: '' } // Local files during development
]

/**
 * Validates that an IPC sender is from an allowed origin
 */
export function validateIpcSender(event: IpcMainInvokeEvent): boolean {
  // Check if senderFrame exists (it should for IPC events)
  if (!event.senderFrame) {
    return false
  }

  const senderURL = event.senderFrame.url

  try {
    const url = new URL(senderURL)

    // Check if origin is in our allowlist
    return ALLOWED_ORIGINS.some(
      (allowed) =>
        url.protocol === allowed.protocol && (allowed.host === '' || url.host === allowed.host)
    )
  } catch {
    // Invalid URL
    return false
  }
}

/**
 * Secure IPC handler wrapper that validates senders
 */
export function handleSecureIpc(
  channel: string,
  handler: (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown
) {
  ipcMain.handle(channel, async (event, ...args) => {
    // Validate sender origin
    if (!validateIpcSender(event)) {
      console.error(
        `IPC security violation: Blocked request from ${event.senderFrame?.url || 'unknown'}`
      )
      throw new Error('Unauthorized IPC request')
    }

    // Call the actual handler
    return handler(event, ...args)
  })
}

/**
 * Security configuration for BrowserWindow
 */
export const secureWindowPreferences = {
  webPreferences: {
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
    webSecurity: true,
    allowRunningInsecureContent: false,
    experimentalFeatures: false,
    enableBlinkFeatures: '',
    preload: undefined as string | undefined // Set this to your preload script path
  }
}

/**
 * Apply security hardening to a BrowserWindow
 */
export function hardenBrowserWindow(window: BrowserWindow) {
  // Prevent navigation to external URLs
  window.webContents.on('will-navigate', (event, url) => {
    const parsedUrl = new URL(url)
    if (parsedUrl.protocol !== 'app:' && parsedUrl.protocol !== 'file:') {
      event.preventDefault()
    }
  })

  // Block new window creation
  window.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' }
  })

  // Disable or limit specific features
  window.webContents.session.setPermissionRequestHandler((_, __, callback) => {
    // Deny all permissions by default
    callback(false)
  })
}
