// main.js (Proceso Principal de Electron)
/**
 * Sistema de Kiosco con Electron
 * Este archivo contiene la configuración del proceso principal de Electron,
 * incluyendo la inicialización de la base de datos, creación de ventanas,
 * configuración de menús y manejo de eventos IPC para la comunicación entre procesos.
 * 
 * @license MIT
 * @version 1.0.0
 */

const { app, BrowserWindow, ipcMain, globalShortcut, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');
const { currentVersion } = require('./version');
const initSqlJs = require('sql.js');

let mainWindow;
let db;

// Crear base de datos si no existe
const userDataPath = app.getPath('userData');
const dbPath = path.join(userDataPath, 'ventas.db');

// Asegurarse de que el directorio existe
if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
}

/**
 * Inicializa la base de datos SQLite
 * Crea las tablas necesarias e inserta datos de ejemplo si es necesario
 */
async function initDatabase() {
    try {
        // Cargar SQL.js
        const SQL = await initSqlJs();
        
        // Verificar si el archivo de base de datos existe
        let dbBuffer;
        if (fs.existsSync(dbPath)) {
            dbBuffer = fs.readFileSync(dbPath);
            db = new SQL.Database(dbBuffer);
            console.log('Base de datos cargada correctamente');
        } else {
            // Crear una nueva base de datos
            db = new SQL.Database();
            console.log('Nueva base de datos creada');
        }
        
        // Inicializar tablas
        // Tabla de ventas
        db.run(`
            CREATE TABLE IF NOT EXISTS ventas (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                producto TEXT NOT NULL,
                precio REAL NOT NULL,
                metodoPago TEXT NOT NULL,
                fecha TEXT NOT NULL
            )
        `);

        // Tabla de productos
        db.run(`
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
        const result = db.exec("SELECT COUNT(*) as count FROM productos");
        const productCount = result[0].values[0][0];

        // Si no hay productos, insertar algunos de ejemplo
        if (productCount === 0) {
            const productos = [
                { codigo: '1001', nombre: 'Coca Cola 600ml', precio: 25.00, cantidad: 50, categoria: 'Bebidas', descripcion: 'Refresco de cola' },
                { codigo: '1002', nombre: 'Sabritas Original', precio: 18.50, cantidad: 30, categoria: 'Snacks', descripcion: 'Papas fritas' },
                { codigo: '1003', nombre: 'Chocolate Milky Way', precio: 15.00, cantidad: 40, categoria: 'Dulces', descripcion: 'Chocolate con caramelo' },
                { codigo: '1004', nombre: 'Agua Mineral 1L', precio: 12.00, cantidad: 60, categoria: 'Bebidas', descripcion: 'Agua mineral sin gas' },
                { codigo: '1005', nombre: 'Chicles Trident', precio: 10.00, cantidad: 100, categoria: 'Dulces', descripcion: 'Chicles sin azúcar' }
            ];

            // Iniciar transacción
            db.run('BEGIN TRANSACTION');
            
            const stmt = db.prepare("INSERT INTO productos (codigo, nombre, precio, cantidad, categoria, descripcion) VALUES (?, ?, ?, ?, ?, ?)");
            
            for (const producto of productos) {
                stmt.run([
                    producto.codigo,
                    producto.nombre,
                    producto.precio,
                    producto.cantidad,
                    producto.categoria,
                    producto.descripcion
                ]);
            }
            
            stmt.free();
            
            // Finalizar transacción
            db.run('COMMIT');
            console.log('Productos de ejemplo insertados correctamente');
        }
        
        // Guardar la base de datos en el archivo
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(dbPath, buffer);
        
    } catch (err) {
        console.error('Error al inicializar la base de datos:', err.message);
    }
}

/**
 * Guarda el estado actual de la base de datos en el archivo
 */
function saveDatabase() {
    if (db) {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(dbPath, buffer);
    }
}

/**
 * Crea el menú principal de la aplicación con todas las opciones disponibles
 */
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
            label: 'Productos',
            submenu: [
                {
                    label: 'Gestionar Productos',
                    click: () => {
                        mainWindow.webContents.send('mostrar-productos');
                    }
                },
                {
                    label: 'Agregar Nuevo Producto',
                    click: () => {
                        mainWindow.webContents.send('nuevo-producto');
                    }
                }
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

/**
 * Maneja la solicitud para obtener todos los productos de la base de datos
 * @event obtener-productos
 * @response productos-obtenidos Array con todos los productos
 */
ipcMain.on('obtener-productos', (event) => {
    try {
        const result = db.exec("SELECT * FROM productos");
        const productos = result.length > 0 ? 
            result[0].values.map((row, index) => {
                const obj = {};
                result[0].columns.forEach((col, colIndex) => {
                    obj[col] = row[colIndex];
                });
                return obj;
            }) : [];
        event.reply('productos-obtenidos', productos);
    } catch (err) {
        event.reply('error', err.message);
    }
});

/**
 * Busca un producto específico por su código de barras
 * @event buscar-producto
 * @param {string} codigo - Código de barras del producto
 * @response producto-encontrado Objeto con los datos del producto o null si no existe
 */
ipcMain.on('buscar-producto', (event, codigo) => {
    try {
        const stmt = db.prepare("SELECT * FROM productos WHERE codigo = ?");
        stmt.bind([codigo]);
        
        const result = stmt.step() ? stmt.getAsObject() : null;
        stmt.free();
        
        event.reply('producto-encontrado', result);
    } catch (err) {
        event.reply('error', err.message);
    }
});

/**
 * Registra una nueva venta en la base de datos
 * @event guardar-venta
 * @param {Object} venta - Datos de la venta (producto, precio, metodoPago, fecha)
 * @response venta-guardada Objeto con el ID de la venta creada
 */
ipcMain.on('guardar-venta', (event, venta) => {
    try {
        const stmt = db.prepare("INSERT INTO ventas (producto, precio, metodoPago, fecha) VALUES (?, ?, ?, ?)");
        stmt.run([venta.producto, venta.precio, venta.metodoPago, venta.fecha]);
        stmt.free();
        
        // Obtener el ID de la última inserción
        const result = db.exec("SELECT last_insert_rowid() as id");
        const id = result[0].values[0][0];
        
        // Guardar la base de datos
        saveDatabase();
        
        event.reply('venta-guardada', { id });
    } catch (err) {
        event.reply('error', err.message);
    }
});

/**
 * Obtiene las ventas filtradas por período (día, mes, año)
 * @event obtener-ventas
 * @param {string} filtro - Tipo de filtro ('dia', 'mes', 'anio')
 * @response ventas-obtenidas Array con las ventas que cumplen el filtro
 */
ipcMain.on('obtener-ventas', (event, filtro) => {
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
        
        const stmt = db.prepare(query);
        if (params.length > 0) {
            stmt.bind(params);
        }
        
        const ventas = [];
        while (stmt.step()) {
            ventas.push(stmt.getAsObject());
        }
        stmt.free();
        
        event.reply('ventas-obtenidas', ventas);
    } catch (err) {
        event.reply('error', err.message);
    }
});

/**
 * Exporta las ventas a un archivo Excel en el escritorio
 * @event exportar-excel
 * @param {Array} ventas - Lista de ventas a exportar
 * @response excel-exportado Ruta del archivo Excel generado
 */
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

/**
 * Registra un nuevo producto en la base de datos
 * @event agregar-producto
 * @param {Object} producto - Datos del producto a agregar
 * @response producto-agregado Objeto con el resultado de la operación
 */
ipcMain.on('agregar-producto', (event, producto) => {
    try {
        const stmt = db.prepare(`
            INSERT INTO productos (codigo, nombre, precio, cantidad, categoria, descripcion) 
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run([
            producto.codigo,
            producto.nombre,
            producto.precio,
            producto.cantidad || 0,
            producto.categoria || '',
            producto.descripcion || ''
        ]);
        
        stmt.free();
        
        // Guardar la base de datos
        saveDatabase();
        
        event.reply('producto-agregado', { success: true });
    } catch (err) {
        event.reply('error', err.message);
    }
});

/**
 * Actualiza los datos de un producto existente
 * @event actualizar-producto
 * @param {Object} producto - Datos actualizados del producto
 * @response producto-actualizado Objeto con el resultado de la operación
 */
ipcMain.on('actualizar-producto', (event, producto) => {
    try {
        const stmt = db.prepare(`
            UPDATE productos 
            SET nombre = ?, precio = ?, cantidad = ?, categoria = ?, descripcion = ? 
            WHERE codigo = ?
        `);
        
        stmt.run([
            producto.nombre,
            producto.precio,
            producto.cantidad || 0,
            producto.categoria || '',
            producto.descripcion || '',
            producto.codigo
        ]);
        
        stmt.free();
        
        // Guardar la base de datos
        saveDatabase();
        
        event.reply('producto-actualizado', { success: true });
    } catch (err) {
        event.reply('error', err.message);
    }
});

/**
 * Elimina un producto de la base de datos
 * @event eliminar-producto
 * @param {string} codigo - Código del producto a eliminar
 * @response producto-eliminado Objeto con el resultado de la operación
 */
ipcMain.on('eliminar-producto', (event, codigo) => {
    try {
        const stmt = db.prepare('DELETE FROM productos WHERE codigo = ?');
        stmt.run([codigo]);
        stmt.free();
        
        // Guardar la base de datos
        saveDatabase();
        
        event.reply('producto-eliminado', { success: true });
    } catch (err) {
        event.reply('error', err.message);
    }
});

app.on('window-all-closed', () => {
    if (db) {
        saveDatabase();
        db.close();
    }
    globalShortcut.unregisterAll();
    if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});
