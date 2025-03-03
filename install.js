// install.js
// Script para instalar las dependencias y configurar el entorno

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Iniciando instalación del Sistema de Kiosco...');

// Verificar si Node.js está instalado
try {
    const nodeVersion = execSync('node --version').toString().trim();
    console.log(`Node.js detectado: ${nodeVersion}`);
} catch (error) {
    console.error('Error: Node.js no está instalado. Por favor, instale Node.js antes de continuar.');
    process.exit(1);
}

// Verificar si npm está instalado
try {
    const npmVersion = execSync('npm --version').toString().trim();
    console.log(`npm detectado: ${npmVersion}`);
} catch (error) {
    console.error('Error: npm no está instalado. Por favor, instale npm antes de continuar.');
    process.exit(1);
}

// Verificar si Python está instalado (útil para algunas dependencias nativas)
try {
    const pythonVersion = execSync('python3 --version').toString().trim();
    console.log(`Python detectado: ${pythonVersion}`);
} catch (error) {
    console.log('Advertencia: Python no está instalado. Algunas dependencias nativas podrían requerir Python para compilarse.');
    console.log('Si encuentra errores durante la instalación, instale Python con: sudo apt-get install python3');
}

// Instalar dependencias
console.log('Instalando dependencias...');
try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('Dependencias instaladas correctamente.');
} catch (error) {
    console.error('Error al instalar dependencias:', error.message);
    console.log('\nSi el error está relacionado con sqlite3, intente instalar las dependencias necesarias:');
    console.log('sudo apt-get install python3 make g++');
    console.log('\nLuego vuelva a ejecutar este script.');
    process.exit(1);
}

// Crear directorio de datos si no existe
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('Directorio de datos creado.');
}

// Inicializar la base de datos
console.log('Inicializando la base de datos...');
try {
    execSync('node db-init.js', { stdio: 'inherit' });
    console.log('Base de datos inicializada correctamente.');
} catch (error) {
    console.error('Error al inicializar la base de datos:', error.message);
    process.exit(1);
}

console.log('\n¡Instalación completada con éxito!');
console.log('\nPara iniciar la aplicación, ejecute:');
console.log('npm start');

console.log('\nPara construir la aplicación para distribución, ejecute:');
console.log('npm run build'); 