import { app, Tray, nativeImage, protocol, net, session } from 'electron'
import { getTodaysTotals } from './usage.js'
import { buildMenu } from './menu.js'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Security: Prevent new window creation and limit navigation
app.on('web-contents-created', (_, contents) => {
  contents.setWindowOpenHandler(() => {
    return { action: 'deny' }
  })

  contents.on('will-navigate', (event) => {
    event.preventDefault()
  })

  // Additional security: prevent frame navigation
  contents.on('will-frame-navigate', (event) => {
    event.preventDefault()
  })

  // Security: Disable DevTools in production
  if (app.isPackaged) {
    contents.on('devtools-opened', () => {
      contents.closeDevTools()
    })
  }
})

let tray: Tray

app.whenReady().then(async () => {
  // Security: Deny all permission requests by default
  session.defaultSession.setPermissionRequestHandler((_, __, callback) => {
    // Deny all permissions - menubar app doesn't need any
    callback(false)
  })

  // Security: Implement Content Security Policy for any web content
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-src 'none'; object-src 'none'"
        ]
      }
    })
  })

  // Security: Register protocol to serve local files safely with path traversal protection
  protocol.handle('app', (request) => {
    const url = request.url.substring(6)
    const normalizedPath = path.normalize(url)

    // Prevent path traversal attacks
    const resolvedPath = path.resolve(__dirname, normalizedPath)
    if (!resolvedPath.startsWith(__dirname)) {
      return new Response('Forbidden', { status: 403 })
    }

    return net.fetch(pathToFileURL(resolvedPath).href)
  })
  // Create tray without icon first to test
  // On macOS, we can create a tray with just text
  if (process.platform === 'darwin') {
    // Create empty 16x16 transparent image
    const icon = nativeImage.createEmpty()
    tray = new Tray(icon)
    // Set initial title immediately
    tray.setTitle('$0.00')
  } else {
    // For other platforms, use the icon
    const iconPath = path.join(__dirname, '..', 'assets', 'Icon.png')
    const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
    tray = new Tray(icon)
  }

  // Set tooltip
  tray.setToolTip('Claude Burn Bar')

  const update = async () => {
    try {
      const totals = await getTodaysTotals()

      // On macOS, show the dollar amount in the menubar
      if (process.platform === 'darwin') {
        const title = `💰 $${totals.usd.toFixed(2)}`
        tray.setTitle(title)
      }

      tray.setContextMenu(buildMenu(totals))
    } catch (error) {
      console.error('Error updating totals:', error)
      // Show $0.00 if there's an error
      if (process.platform === 'darwin') {
        tray.setTitle('$0.00')
      }
    }
  }

  await update()
  setInterval(update, 300_000) // once per 5 minutes
})

// Prevent app from quitting when all windows are closed (menubar app behavior)
app.on('window-all-closed', () => {
  // Don't quit on macOS
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
