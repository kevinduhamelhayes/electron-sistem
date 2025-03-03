# Sistema de Kiosco con Electron

Una aplicación de escritorio para gestionar ventas en un kiosco, desarrollada con Electron.js.

## Características

- **Registro de Ventas**: Ingreso rápido de productos mediante código de barras
- **Métodos de Pago**: Soporte para pagos en efectivo y tarjeta
- **Estadísticas**: Visualización de ventas por día, mes y año
- **Exportación**: Exportación de datos a Excel
- **Atajos de Teclado**: F2 para guardar ventas rápidamente

## Tecnologías Utilizadas

- **Electron.js**: Framework para aplicaciones de escritorio
- **SQLite**: Base de datos local para almacenar ventas
- **ExcelJS**: Generación de reportes en Excel
- **HTML/CSS/JavaScript**: Interfaz de usuario

## Estructura del Proyecto

```
📂 electron-sistema-kiosco/
├── 📄 main.js - Proceso principal de Electron
├── 📄 index.html - Interfaz de usuario
├── 📄 renderer.js - Lógica del frontend
├── 📄 styles.css - Estilos de la aplicación
├── 📄 package.json - Dependencias y configuración
└── 📄 README.md - Documentación
```

## Instalación

1. Clona este repositorio:
   ```
   git clone [URL del repositorio]
   ```

2. Instala las dependencias:
   ```
   npm install
   ```

3. Inicia la aplicación:
   ```
   npm start
   ```

## Uso

### Registro de Ventas

1. Ingresa el código de barras del producto (o selecciónalo de la lista)
2. El sistema automáticamente mostrará el nombre y precio del producto
3. Selecciona el método de pago (efectivo o tarjeta)
4. Presiona "Guardar Venta" o usa el atajo F2

### Estadísticas

1. Haz clic en la pestaña "Estadísticas"
2. Selecciona el período que deseas visualizar (día, mes, año)
3. Revisa los totales y el desglose de ventas
4. Exporta a Excel si necesitas un reporte detallado

## Desarrollo

Para construir la aplicación para distribución:

```
npm run build
```

Esto generará los archivos de instalación en la carpeta `dist`.

## Licencia

ISC


