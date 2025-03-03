// renderer.js
const { ipcRenderer } = require('electron');

// Elementos DOM
const ventasSection = document.getElementById('ventas-section');
const productosSection = document.getElementById('productos-section');
const estadisticasSection = document.getElementById('estadisticas-section');
const btnVentas = document.getElementById('btn-ventas');
const btnProductos = document.getElementById('btn-productos');
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

// Elementos DOM para la sección de productos
const tablaProductos = document.getElementById('tabla-productos').querySelector('tbody');
const btnNuevoProducto = document.getElementById('btn-nuevo-producto');
const buscarProductoInput = document.getElementById('buscar-producto');
const productoModal = document.getElementById('producto-modal');
const productoForm = document.getElementById('producto-form');
const modalTitle = document.getElementById('modal-title');
const productoIdInput = document.getElementById('producto-id');
const productoCodigoInput = document.getElementById('producto-codigo');
const productoNombreInput = document.getElementById('producto-nombre');
const productoPrecioInput = document.getElementById('producto-precio');
const productoCantidadInput = document.getElementById('producto-cantidad');
const productoCategoriaInput = document.getElementById('producto-categoria');
const productoDescripcionInput = document.getElementById('producto-descripcion');
const btnCancelarProducto = document.getElementById('cancelar-producto');
const closeModal = document.querySelector('.close-modal');

// Variables globales
let ventasData = [];
let productosData = [];
let filtroActual = 'dia';
let appVersion = '';
let modoEdicion = false;

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
    productosSection.classList.remove('active');
    estadisticasSection.classList.remove('active');
    btnVentas.classList.add('active');
    btnProductos.classList.remove('active');
    btnEstadisticas.classList.remove('active');
});

btnProductos.addEventListener('click', () => {
    ventasSection.classList.remove('active');
    productosSection.classList.add('active');
    estadisticasSection.classList.remove('active');
    btnVentas.classList.remove('active');
    btnProductos.classList.add('active');
    btnEstadisticas.classList.remove('active');
    cargarProductos();
});

btnEstadisticas.addEventListener('click', () => {
    ventasSection.classList.remove('active');
    productosSection.classList.remove('active');
    estadisticasSection.classList.add('active');
    btnVentas.classList.remove('active');
    btnProductos.classList.remove('active');
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
    
    // Si estamos en la sección de productos, actualizar la tabla
    if (productosSection.classList.contains('active')) {
        actualizarTablaProductos();
    }
});

// Actualizar tabla de productos
function actualizarTablaProductos() {
    // Limpiar tabla
    tablaProductos.innerHTML = '';
    
    // Filtrar productos si hay búsqueda
    const busqueda = buscarProductoInput.value.toLowerCase();
    const productosFiltrados = busqueda 
        ? productosData.filter(p => 
            p.codigo.toLowerCase().includes(busqueda) || 
            p.nombre.toLowerCase().includes(busqueda) ||
            (p.categoria && p.categoria.toLowerCase().includes(busqueda))
          )
        : productosData;
    
    // Llenar tabla
    productosFiltrados.forEach(producto => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${producto.codigo}</td>
            <td>${producto.nombre}</td>
            <td>$${producto.precio.toFixed(2)}</td>
            <td>${producto.cantidad}</td>
            <td>${producto.categoria || '-'}</td>
            <td>
                <button class="btn-editar" data-codigo="${producto.codigo}">Editar</button>
                <button class="btn-eliminar" data-codigo="${producto.codigo}">Eliminar</button>
            </td>
        `;
        
        tablaProductos.appendChild(row);
    });
    
    // Agregar event listeners a los botones
    document.querySelectorAll('.btn-editar').forEach(btn => {
        btn.addEventListener('click', () => {
            const codigo = btn.getAttribute('data-codigo');
            editarProducto(codigo);
        });
    });
    
    document.querySelectorAll('.btn-eliminar').forEach(btn => {
        btn.addEventListener('click', () => {
            const codigo = btn.getAttribute('data-codigo');
            confirmarEliminarProducto(codigo);
        });
    });
}

// Buscar producto
buscarProductoInput.addEventListener('input', () => {
    actualizarTablaProductos();
});

// Abrir modal para nuevo producto
btnNuevoProducto.addEventListener('click', () => {
    abrirModalProducto();
});

// Cerrar modal
function cerrarModalProducto() {
    productoModal.style.display = 'none';
    productoForm.reset();
}

closeModal.addEventListener('click', cerrarModalProducto);
btnCancelarProducto.addEventListener('click', cerrarModalProducto);

// Cuando se hace clic fuera del modal, cerrarlo
window.addEventListener('click', (event) => {
    if (event.target === productoModal) {
        cerrarModalProducto();
    }
});

// Abrir modal para nuevo producto
function abrirModalProducto(producto = null) {
    // Limpiar formulario
    productoForm.reset();
    
    if (producto) {
        // Modo edición
        modoEdicion = true;
        modalTitle.textContent = 'Editar Producto';
        productoIdInput.value = producto.id;
        productoCodigoInput.value = producto.codigo;
        productoCodigoInput.readOnly = true; // No permitir cambiar el código en edición
        productoNombreInput.value = producto.nombre;
        productoPrecioInput.value = producto.precio;
        productoCantidadInput.value = producto.cantidad;
        productoCategoriaInput.value = producto.categoria || '';
        productoDescripcionInput.value = producto.descripcion || '';
    } else {
        // Modo nuevo producto
        modoEdicion = false;
        modalTitle.textContent = 'Nuevo Producto';
        productoIdInput.value = '';
        productoCodigoInput.readOnly = false;
    }
    
    productoModal.style.display = 'block';
}

// Editar producto
function editarProducto(codigo) {
    const producto = productosData.find(p => p.codigo === codigo);
    if (producto) {
        abrirModalProducto(producto);
    }
}

// Confirmar eliminación de producto
function confirmarEliminarProducto(codigo) {
    const producto = productosData.find(p => p.codigo === codigo);
    if (producto && confirm(`¿Está seguro que desea eliminar el producto "${producto.nombre}"?`)) {
        eliminarProducto(codigo);
    }
}

// Eliminar producto
function eliminarProducto(codigo) {
    ipcRenderer.send('eliminar-producto', codigo);
}

// Recibir confirmación de producto eliminado
ipcRenderer.on('producto-eliminado', () => {
    cargarProductos();
});

// Guardar producto con validaciones adicionales
productoForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Validar código
    const codigo = productoCodigoInput.value.trim();
    if (!codigo) {
        alert('El código del producto es obligatorio.');
        productoCodigoInput.focus();
        return;
    }
    
    // Validar nombre
    const nombre = productoNombreInput.value.trim();
    if (!nombre) {
        alert('El nombre del producto es obligatorio.');
        productoNombreInput.focus();
        return;
    }
    
    // Validar precio
    const precio = parseFloat(productoPrecioInput.value);
    if (isNaN(precio) || precio <= 0) {
        alert('El precio debe ser un número mayor que cero.');
        productoPrecioInput.focus();
        return;
    }
    
    // Validar que no exista otro producto con el mismo código (solo en modo nuevo producto)
    if (!modoEdicion) {
        const productoExistente = productosData.find(p => p.codigo === codigo);
        if (productoExistente) {
            alert(`Ya existe un producto con el código "${codigo}".`);
            productoCodigoInput.focus();
            return;
        }
    }
    
    const producto = {
        codigo: codigo,
        nombre: nombre,
        precio: precio,
        cantidad: parseInt(productoCantidadInput.value) || 0,
        categoria: productoCategoriaInput.value.trim(),
        descripcion: productoDescripcionInput.value.trim()
    };
    
    if (modoEdicion) {
        // Actualizar producto existente
        ipcRenderer.send('actualizar-producto', producto);
    } else {
        // Agregar nuevo producto
        ipcRenderer.send('agregar-producto', producto);
    }
    
    cerrarModalProducto();
});

// Recibir confirmación de producto agregado
ipcRenderer.on('producto-agregado', () => {
    cargarProductos();
});

// Recibir confirmación de producto actualizado
ipcRenderer.on('producto-actualizado', () => {
    cargarProductos();
});

// Recibir errores
ipcRenderer.on('error', (event, mensaje) => {
    alert(`Error: ${mensaje}`);
});

// Validar código de barras (solo números y letras, sin espacios)
productoCodigoInput.addEventListener('input', (e) => {
    const valor = e.target.value;
    // Permitir solo letras, números y guiones
    if (!/^[a-zA-Z0-9\-]*$/.test(valor)) {
        e.target.value = valor.replace(/[^a-zA-Z0-9\-]/g, '');
    }
});

// Validar precio (solo números positivos con hasta 2 decimales)
productoPrecioInput.addEventListener('input', (e) => {
    const valor = e.target.value;
    if (valor && parseFloat(valor) < 0) {
        e.target.value = 0;
    }
});

// Validar cantidad (solo números enteros positivos)
productoCantidadInput.addEventListener('input', (e) => {
    const valor = e.target.value;
    if (valor && parseInt(valor) < 0) {
        e.target.value = 0;
    }
    // Asegurar que sea un número entero
    e.target.value = Math.floor(parseFloat(valor));
});

// Validar código de barras en la venta (solo números y letras, sin espacios)
codigoInput.addEventListener('input', (e) => {
    const valor = e.target.value;
    // Permitir solo letras, números y guiones
    if (!/^[a-zA-Z0-9\-]*$/.test(valor)) {
        e.target.value = valor.replace(/[^a-zA-Z0-9\-]/g, '');
    }
    
    // Buscar producto si hay un código válido
    if (valor.trim()) {
        ipcRenderer.send('buscar-producto', valor.trim());
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

// Event listener para el formulario de venta
ventaForm.addEventListener('submit', (e) => {
    e.preventDefault();
    guardarVenta();
});

// Mejorar la función de guardar venta con validaciones
function guardarVenta() {
    const codigo = codigoInput.value.trim();
    const producto = productoInput.value.trim();
    const precio = parseFloat(precioInput.value);
    const metodoPago = metodoPagoSelect.value;
    
    if (!codigo) {
        alert('Por favor, ingrese un código de producto.');
        codigoInput.focus();
        return;
    }
    
    if (!producto) {
        alert('No se ha encontrado un producto con ese código.');
        codigoInput.focus();
        return;
    }
    
    if (isNaN(precio) || precio <= 0) {
        alert('El precio debe ser un número mayor que cero.');
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

// Manejar eventos del menú
ipcRenderer.on('mostrar-productos', () => {
    ventasSection.classList.remove('active');
    productosSection.classList.add('active');
    estadisticasSection.classList.remove('active');
    btnVentas.classList.remove('active');
    btnProductos.classList.add('active');
    btnEstadisticas.classList.remove('active');
    cargarProductos();
});

ipcRenderer.on('nuevo-producto', () => {
    ventasSection.classList.remove('active');
    productosSection.classList.add('active');
    estadisticasSection.classList.remove('active');
    btnVentas.classList.remove('active');
    btnProductos.classList.add('active');
    btnEstadisticas.classList.remove('active');
    cargarProductos();
    abrirModalProducto();
});

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    cargarProductos();
    cargarVentasRecientes();
}); 