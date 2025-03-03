// version.js
// Archivo para gestionar la versión de la aplicación

const fs = require('fs');
const path = require('path');

// Leer la versión actual del package.json
const packageJsonPath = path.join(__dirname, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const currentVersion = packageJson.version;

// Función para incrementar la versión
function incrementVersion(versionType = 'patch') {
    const [major, minor, patch] = currentVersion.split('.').map(Number);
    
    let newVersion;
    switch (versionType) {
        case 'major':
            newVersion = `${major + 1}.0.0`;
            break;
        case 'minor':
            newVersion = `${major}.${minor + 1}.0`;
            break;
        case 'patch':
        default:
            newVersion = `${major}.${minor}.${patch + 1}`;
            break;
    }
    
    // Actualizar el package.json
    packageJson.version = newVersion;
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    
    console.log(`Versión actualizada: ${currentVersion} -> ${newVersion}`);
    return newVersion;
}

// Obtener el historial de cambios
function getChangeLog() {
    const changeLogPath = path.join(__dirname, 'CHANGELOG.md');
    
    if (fs.existsSync(changeLogPath)) {
        return fs.readFileSync(changeLogPath, 'utf8');
    } else {
        return 'No hay historial de cambios disponible.';
    }
}

// Agregar un nuevo cambio al historial
function addChangeLogEntry(version, changes) {
    const changeLogPath = path.join(__dirname, 'CHANGELOG.md');
    const date = new Date().toISOString().split('T')[0];
    
    let changeLog = '';
    if (fs.existsSync(changeLogPath)) {
        changeLog = fs.readFileSync(changeLogPath, 'utf8');
    }
    
    const newEntry = `## [${version}] - ${date}\n\n${changes}\n\n`;
    
    fs.writeFileSync(changeLogPath, newEntry + changeLog);
    console.log(`Entrada agregada al historial de cambios para la versión ${version}`);
}

module.exports = {
    currentVersion,
    incrementVersion,
    getChangeLog,
    addChangeLogEntry
}; 