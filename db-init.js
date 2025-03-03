// db-init.js
// Script para inicializar la base de datos con productos de ejemplo

const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const { app } = require('electron');
const fs = require('fs');

// Asegúrate de que app esté disponible (solo si se ejecuta desde Electron)
const userDataPath = app ? app.getPath('userData') : path.join(__dirname, 'data');

// Crear directorio si no existe
if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
}

const dbPath = path.join(userDataPath, 'ventas.db');

async function initDatabase() {
    try {
        // Abrir la base de datos
        const db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });
        console.log('Base de datos conectada correctamente');

        // Crear tablas
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
                { codigo: '1005', nombre: 'Chicles Trident', precio: 10.00, cantidad: 100, categoria: 'Dulces', descripcion: 'Chicles sin azúcar' },
                { codigo: '1006', nombre: 'Galletas Oreo', precio: 20.00, cantidad: 45, categoria: 'Galletas', descripcion: 'Galletas de chocolate' },
                { codigo: '1007', nombre: 'Jugo de Naranja 1L', precio: 30.00, cantidad: 25, categoria: 'Bebidas', descripcion: 'Jugo natural' },
                { codigo: '1008', nombre: 'Doritos Nacho', precio: 18.50, cantidad: 35, categoria: 'Snacks', descripcion: 'Totopos de maíz' },
                { codigo: '1009', nombre: 'Cerveza Corona 355ml', precio: 22.00, cantidad: 48, categoria: 'Bebidas Alcohólicas', descripcion: 'Cerveza clara' },
                { codigo: '1010', nombre: 'Café Instantáneo', precio: 45.00, cantidad: 20, categoria: 'Café', descripcion: 'Café soluble' }
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
            console.log("Productos de ejemplo insertados correctamente");
        }

        // Cerrar la conexión cuando termine
        await db.close();
        console.log("Base de datos inicializada correctamente");
    } catch (err) {
        console.error("Error al inicializar la base de datos:", err.message);
        process.exit(1);
    }
}

// Ejecutar la inicialización
initDatabase(); 