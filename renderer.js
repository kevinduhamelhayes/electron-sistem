// renderer.js
const { ipcRenderer } = require('electron');

// Elementos DOM
const ventasSection = document.getElementById('ventas-section');
const estadisticasSection = document.getElementById('estadisticas-section');
const btnVentas = document.getElementById('btn-ventas');
const btnEstadisticas = document.getElementById('btn-estadisticas');
const ventaForm = document.getElementById('venta-form');
const codigoInput = document.getElementById('codigo');
const productoInput = document.getElementById('producto');
const precioInput = document.getElementById('precio');
const metodoPagoSelect = document.getElementById('metodo-pago');
const tablaVentasRecientes = document.getElementById('tabla-ventas-recientes').querySelector('tbody');
const tablaEstadisticas = document.getElementById('tabla-estadisticas').querySelector('tbody');
const btnExportarExcel = document.getElementById('btn-exportar-excel');
const filtroDia = document.getElementById('filtro-dia');
const filtroMes = document.getElementById('filtro-mes');
const filtroAnio = document.getElementById('filtro-anio');
const totalVendido = document.getElementById('total-vendido');
const totalEfectivo = document.getElementById('total-efectivo');
const totalTarjeta = document.getElementById('total-tarjeta');

// Variables globales
let ventasData = [];
let productosData = [];
let filtroActual = 'dia';
let appVersion = '';

// Obtener versión de la aplicación
ipcRenderer.send('obtener-version');
ipcRenderer.on('version', (event, version) => {
    appVersion = version;
    // Actualizar versión en la interfaz si existe el elemento
    const versionElement = document.getElementById('app-version');
    if (versionElement) {
        versionElement.textContent = `v${version}`;
    }
});

// Navegación entre secciones
btnVentas.addEventListener('click', () => {
    ventasSection.classList.add('active');
    estadisticasSection.classList.remove('active');
    btnVentas.classList.add('active');
    btnEstadisticas.classList.remove('active');
});

btnEstadisticas.addEventListener('click', () => {
    ventasSection.classList.remove('active');
    estadisticasSection.classList.add('active');
    btnVentas.classList.remove('active');
    btnEstadisticas.classList.add('active');
    cargarEstadisticas();
});

// Cargar productos al iniciar
function cargarProductos() {
    ipcRenderer.send('obtener-productos');
}

// Recibir productos desde el proceso principal
ipcRenderer.on('productos-obtenidos', (event, productos) => {
    productosData = productos;
});

// Buscar producto por código de barras
codigoInput.addEventListener('input', () => {
    const codigo = codigoInput.value.trim();
    
    if (codigo) {
        // Buscar en la base de datos
        ipcRenderer.send('buscar-producto', codigo);
    } else {
        productoInput.value = '';
        precioInput.value = '';
    }
});

// Recibir producto encontrado
ipcRenderer.on('producto-encontrado', (event, producto) => {
    if (producto) {
        productoInput.value = producto.nombre;
        precioInput.value = producto.precio;
    } else {
        productoInput.value = '';
        precioInput.value = '';
    }
});

// Guardar venta
ventaForm.addEventListener('submit', (e) => {
    e.preventDefault();
    guardarVenta();
});

function guardarVenta() {
    const codigo = codigoInput.value.trim();
    const producto = productoInput.value;
    const precio = parseFloat(precioInput.value);
    const metodoPago = metodoPagoSelect.value;
    
    if (!codigo || !producto || isNaN(precio)) {
        alert('Por favor, complete todos los campos correctamente.');
        return;
    }
    
    const venta = {
        producto,
        precio,
        metodoPago,
        fecha: new Date().toISOString()
    };
    
    // Enviar al proceso principal
    ipcRenderer.send('guardar-venta', venta);
    
    // Limpiar formulario
    codigoInput.value = '';
    productoInput.value = '';
    precioInput.value = '';
    metodoPagoSelect.value = 'efectivo';
    codigoInput.focus();
}

// Recibir confirmación de venta guardada
ipcRenderer.on('venta-guardada', () => {
    cargarVentasRecientes();
});

// Cargar ventas recientes
function cargarVentasRecientes() {
    ipcRenderer.send('obtener-ventas');
}

// Recibir ventas desde el proceso principal
ipcRenderer.on('ventas-obtenidas', (event, ventas) => {
    ventasData = ventas;
    
    // Mostrar las 5 ventas más recientes
    const ventasRecientes = ventas.slice(0, 5);
    
    // Limpiar tabla
    tablaVentasRecientes.innerHTML = '';
    
    // Llenar tabla
    ventasRecientes.forEach(venta => {
        const row = document.createElement('tr');
        
        const fecha = new Date(venta.fecha);
        const fechaFormateada = `${fecha.toLocaleDateString()} ${fecha.toLocaleTimeString()}`;
        
        row.innerHTML = `
            <td>${venta.producto}</td>
            <td>$${venta.precio.toFixed(2)}</td>
            <td>${venta.metodoPago === 'efectivo' ? 'Efectivo' : 'Tarjeta'}</td>
            <td>${fechaFormateada}</td>
        `;
        
        tablaVentasRecientes.appendChild(row);
    });
    
    // Si estamos en la sección de estadísticas, actualizar también
    if (estadisticasSection.classList.contains('active')) {
        actualizarEstadisticas();
    }
});

// Filtros de estadísticas
filtroDia.addEventListener('click', () => {
    filtroActual = 'dia';
    actualizarFiltroActivo();
    cargarEstadisticasFiltradas();
});

filtroMes.addEventListener('click', () => {
    filtroActual = 'mes';
    actualizarFiltroActivo();
    cargarEstadisticasFiltradas();
});

filtroAnio.addEventListener('click', () => {
    filtroActual = 'anio';
    actualizarFiltroActivo();
    cargarEstadisticasFiltradas();
});

function actualizarFiltroActivo() {
    filtroDia.classList.remove('active');
    filtroMes.classList.remove('active');
    filtroAnio.classList.remove('active');
    
    if (filtroActual === 'dia') {
        filtroDia.classList.add('active');
    } else if (filtroActual === 'mes') {
        filtroMes.classList.add('active');
    } else {
        filtroAnio.classList.add('active');
    }
}

// Cargar estadísticas
function cargarEstadisticas() {
    cargarEstadisticasFiltradas();
}

// Cargar estadísticas con filtro
function cargarEstadisticasFiltradas() {
    ipcRenderer.send('obtener-ventas', filtroActual);
}

// Actualizar estadísticas según el filtro
function actualizarEstadisticas() {
    // Calcular totales
    const total = ventasData.reduce((sum, venta) => sum + venta.precio, 0);
    const totalEfectivoValue = ventasData
        .filter(venta => venta.metodoPago === 'efectivo')
        .reduce((sum, venta) => sum + venta.precio, 0);
    const totalTarjetaValue = ventasData
        .filter(venta => venta.metodoPago === 'tarjeta')
        .reduce((sum, venta) => sum + venta.precio, 0);
    
    // Actualizar UI
    totalVendido.textContent = `$${total.toFixed(2)}`;
    totalEfectivo.textContent = `$${totalEfectivoValue.toFixed(2)}`;
    totalTarjeta.textContent = `$${totalTarjetaValue.toFixed(2)}`;
    
    // Limpiar tabla
    tablaEstadisticas.innerHTML = '';
    
    // Llenar tabla
    ventasData.forEach(venta => {
        const row = document.createElement('tr');
        
        const fecha = new Date(venta.fecha);
        const fechaFormateada = `${fecha.toLocaleDateString()} ${fecha.toLocaleTimeString()}`;
        
        row.innerHTML = `
            <td>${venta.id}</td>
            <td>${venta.producto}</td>
            <td>$${venta.precio.toFixed(2)}</td>
            <td>${venta.metodoPago === 'efectivo' ? 'Efectivo' : 'Tarjeta'}</td>
            <td>${fechaFormateada}</td>
        `;
        
        tablaEstadisticas.appendChild(row);
    });
}

// Exportar a Excel
btnExportarExcel.addEventListener('click', () => {
    exportarExcel();
});

function exportarExcel() {
    ipcRenderer.send('exportar-excel', ventasData);
}

ipcRenderer.on('excel-exportado', (event, filePath) => {
    alert(`Archivo Excel exportado correctamente en: ${filePath}`);
});

// Mostrar ventana de Acerca de
ipcRenderer.on('mostrar-acerca-de', () => {
    const acercaDeHTML = `
        <div class="acerca-de-modal">
            <h2>Sistema de Kiosco</h2>
            <p>Versión: ${appVersion}</p>
            <p>Una aplicación para gestionar ventas en kioscos.</p>
            <p>© 2025 - Todos los derechos reservados</p>
            <button id="cerrar-acerca-de">Cerrar</button>
        </div>
    `;
    
    const modalContainer = document.createElement('div');
    modalContainer.className = 'modal-container';
    modalContainer.innerHTML = acercaDeHTML;
    document.body.appendChild(modalContainer);
    
    document.getElementById('cerrar-acerca-de').addEventListener('click', () => {
        document.body.removeChild(modalContainer);
    });
});

// Manejar acción de menú para exportar Excel
ipcRenderer.on('menu-exportar-excel', () => {
    exportarExcel();
});

// Atajos de teclado
document.addEventListener('keydown', (e) => {
    // F2 para guardar venta
    if (e.key === 'F2' && ventasSection.classList.contains('active')) {
        e.preventDefault();
        guardarVenta();
    }
});

// Escuchar atajo desde el proceso principal
ipcRenderer.on('atajo-guardar-venta', () => {
    if (ventasSection.classList.contains('active')) {
        guardarVenta();
    }
});

// Manejar errores
ipcRenderer.on('error', (event, mensaje) => {
    alert(`Error: ${mensaje}`);
});

// Cargar datos al iniciar
cargarProductos();
cargarVentasRecientes(); 