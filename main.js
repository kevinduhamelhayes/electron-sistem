// main.js (Proceso Principal de Electron)
const { app, BrowserWindow, ipcMain, globalShortcut, Menu } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const fs = require('fs');
const ExcelJS = require('exceljs');
const { currentVersion } = require('./version');

let mainWindow;
let db;

// Crear base de datos si no existe
const userDataPath = app.getPath('userData');
const dbPath = path.join(userDataPath, 'ventas.db');

// Asegurarse de que el directorio existe
if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
}

// Inicializar la base de datos
async function initDatabase() {
    try {
        db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });
        console.log('Base de datos conectada correctamente');
        
        // Inicializar tablas
        // Tabla de ventas
        await db.exec(`
            CREATE TABLE IF NOT EXISTS ventas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                producto TEXT NOT NULL,
                precio REAL NOT NULL,
                metodoPago TEXT NOT NULL,
                fecha TEXT NOT NULL
            )
        `);

        // Tabla de productos
        await db.exec(`
            CREATE TABLE IF NOT EXISTS productos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                codigo TEXT UNIQUE NOT NULL,
                nombre TEXT NOT NULL,
                precio REAL NOT NULL,
                cantidad INTEGER DEFAULT 0,
                categoria TEXT,
                descripcion TEXT
            )
        `);

        // Verificar si ya existen productos
        const productCount = await db.get("SELECT COUNT(*) as count FROM productos");

        // Si no hay productos, insertar algunos de ejemplo
        if (productCount.count === 0) {
            const productos = [
                { codigo: '1001', nombre: 'Coca Cola 600ml', precio: 25.00, cantidad: 50, categoria: 'Bebidas', descripcion: 'Refresco de cola' },
                { codigo: '1002', nombre: 'Sabritas Original', precio: 18.50, cantidad: 30, categoria: 'Snacks', descripcion: 'Papas fritas' },
                { codigo: '1003', nombre: 'Chocolate Milky Way', precio: 15.00, cantidad: 40, categoria: 'Dulces', descripcion: 'Chocolate con caramelo' },
                { codigo: '1004', nombre: 'Agua Mineral 1L', precio: 12.00, cantidad: 60, categoria: 'Bebidas', descripcion: 'Agua mineral sin gas' },
                { codigo: '1005', nombre: 'Chicles Trident', precio: 10.00, cantidad: 100, categoria: 'Dulces', descripcion: 'Chicles sin azúcar' }
            ];

            // Iniciar transacción
            await db.run('BEGIN TRANSACTION');
            
            for (const producto of productos) {
                await db.run(
                    "INSERT INTO productos (codigo, nombre, precio, cantidad, categoria, descripcion) VALUES (?, ?, ?, ?, ?, ?)",
                    [producto.codigo, producto.nombre, producto.precio, producto.cantidad, producto.categoria, producto.descripcion]
                );
            }
            
            // Finalizar transacción
            await db.run('COMMIT');
            console.log('Productos de ejemplo insertados correctamente');
        }
    } catch (err) {
        console.error('Error al inicializar la base de datos:', err.message);
    }
}

// Crear menú de la aplicación
function createMenu() {
    const template = [
        {
            label: 'Archivo',
            submenu: [
                {
                    label: 'Exportar a Excel',
                    click: () => {
                        mainWindow.webContents.send('menu-exportar-excel');
                    }
                },
                { type: 'separator' },
                { role: 'quit', label: 'Salir' }
            ]
        },
        {
            label: 'Ver',
            submenu: [
                { role: 'reload', label: 'Recargar' },
                { role: 'toggleDevTools', label: 'Herramientas de Desarrollo' },
                { type: 'separator' },
                { role: 'togglefullscreen', label: 'Pantalla Completa' }
            ]
        },
        {
            label: 'Ayuda',
            submenu: [
                {
                    label: `Acerca de (v${currentVersion})`,
                    click: () => {
                        mainWindow.webContents.send('mostrar-acerca-de');
                    }
                }
            ]
        }
    ];
    
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

app.whenReady().then(async () => {
    // Inicializar la base de datos
    await initDatabase();
    
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
        title: `Sistema de Kiosco v${currentVersion}`
    });
    mainWindow.loadURL(`file://${__dirname}/index.html`);
    
    // Crear menú
    createMenu();
    
    // Registrar atajos de teclado globales
    globalShortcut.register('F2', () => {
        mainWindow.webContents.send('atajo-guardar-venta');
    });
});

// Obtener versión
ipcMain.on('obtener-version', (event) => {
    event.reply('version', currentVersion);
});

// Obtener productos
ipcMain.on('obtener-productos', async (event) => {
    try {
        const productos = await db.all("SELECT * FROM productos");
        event.reply('productos-obtenidos', productos);
    } catch (err) {
        event.reply('error', err.message);
    }
});

// Buscar producto por código
ipcMain.on('buscar-producto', async (event, codigo) => {
    try {
        const producto = await db.get("SELECT * FROM productos WHERE codigo = ?", codigo);
        event.reply('producto-encontrado', producto || null);
    } catch (err) {
        event.reply('error', err.message);
    }
});

// Guardar venta
ipcMain.on('guardar-venta', async (event, venta) => {
    try {
        const result = await db.run(
            "INSERT INTO ventas (producto, precio, metodoPago, fecha) VALUES (?, ?, ?, ?)",
            [venta.producto, venta.precio, venta.metodoPago, venta.fecha]
        );
        event.reply('venta-guardada', { id: result.lastID });
    } catch (err) {
        event.reply('error', err.message);
    }
});

// Obtener ventas
ipcMain.on('obtener-ventas', async (event, filtro) => {
    try {
        let query = "SELECT * FROM ventas";
        let params = [];
        
        if (filtro) {
            const ahora = new Date();
            
            if (filtro === 'dia') {
                // Ventas del día actual
                const hoy = ahora.toISOString().split('T')[0];
                query += " WHERE fecha LIKE ?";
                params.push(`${hoy}%`);
            } else if (filtro === 'mes') {
                // Ventas del mes actual
                const mes = ahora.getMonth() + 1;
                const anio = ahora.getFullYear();
                query += " WHERE fecha LIKE ?";
                params.push(`${anio}-${mes.toString().padStart(2, '0')}%`);
            } else if (filtro === 'anio') {
                // Ventas del año actual
                const anio = ahora.getFullYear();
                query += " WHERE fecha LIKE ?";
                params.push(`${anio}%`);
            }
        }
        
        query += " ORDER BY id DESC";
        
        const ventas = await db.all(query, params);
        event.reply('ventas-obtenidas', ventas);
    } catch (err) {
        event.reply('error', err.message);
    }
});

// Exportar a Excel
ipcMain.on('exportar-excel', async (event, ventas) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Ventas');

    worksheet.columns = [
        { header: 'ID', key: 'id', width: 10 },
        { header: 'Producto', key: 'producto', width: 25 },
        { header: 'Precio', key: 'precio', width: 15 },
        { header: 'Método de Pago', key: 'metodoPago', width: 20 },
        { header: 'Fecha', key: 'fecha', width: 20 },
    ];

    ventas.forEach((venta) => {
        worksheet.addRow(venta);
    });

    const filePath = path.join(app.getPath('desktop'), 'ventas.xlsx');
    await workbook.xlsx.writeFile(filePath);
    event.reply('excel-exportado', filePath);
});

app.on('window-all-closed', async () => {
    if (db) {
        await db.close();
    }
    globalShortcut.unregisterAll();
    if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});
