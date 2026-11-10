// Ventana de escritorio (Windows/Steam) que carga el mismo juego web
const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

function crearVentana() {
  const win = new BrowserWindow({
    width: 1280, height: 760, minWidth: 800, minHeight: 500,
    backgroundColor: '#05050c', title: 'Hordas del Vacío', autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false }
  });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, '..', 'index.html'));
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') win.setFullScreen(!win.isFullScreen());
  });
}

app.whenReady().then(crearVentana);
app.on('window-all-closed', () => app.quit());
