/**
 * Tach Racing — Caja & Bancos
 * Backend en Google Apps Script para conectar la app web con Google Sheets.
 *
 * Cómo instalarlo: ver SETUP_GOOGLE_SHEETS.md en la raíz del repo.
 */

const SHEETS = {
  MOV: 'Movimientos',
  EMP: 'Empleados',
  CAT: 'Categorias'
};

const MOV_HEADERS = ['id', 'tipo', 'fecha', 'monto', 'moneda', 'descripcion', 'cuenta', 'cuentaOrigen', 'cuentaDestino', 'categoria', 'empleado', 'socio', 'subTipo'];
const EMP_HEADERS = ['id', 'nombre', 'cargo', 'sueldo'];
const CAT_HEADERS = ['tipo', 'nombre'];

const CATEGORIAS_DEFAULT = {
  ingreso: ['Ventas', 'Servicios', 'Otros ingresos'],
  egreso: ['Combustible', 'Alquiler', 'Impuestos', 'Marketing', 'Logística', 'Mantenimiento', 'Repuestos', 'Otros'],
  aporte: ['Aporte entrada', 'Retiro/extracción', 'Capital propio']
};

function doGet(e) {
  const action = e.parameter.action;
  if (action === 'getAll') return jsonResponse(getAll());
  return jsonResponse({ error: 'Acción desconocida: ' + action });
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;
    let result;
    switch (action) {
      case 'addMovimiento':
        result = addMovimiento(body.data);
        break;
      case 'deleteMovimiento':
        result = deleteRowById(SHEETS.MOV, MOV_HEADERS, body.id);
        break;
      case 'addEmpleado':
        result = addEmpleado(body.data);
        break;
      case 'deleteEmpleado':
        result = deleteRowById(SHEETS.EMP, EMP_HEADERS, body.id);
        break;
      case 'addCategoria':
        result = addCategoria(body.tipo, body.nombre);
        break;
      case 'deleteCategoria':
        result = deleteCategoria(body.tipo, body.nombre);
        break;
      default:
        return jsonResponse({ ok: false, error: 'Acción desconocida: ' + action });
    }
    return jsonResponse({ ok: true, result: result });
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message });
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function getSheet(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  }
  return sheet;
}

function rowsToObjects(sheet, headers) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  return values
    .map(function (row) {
      const obj = {};
      headers.forEach(function (h, i) { obj[h] = row[i]; });
      return obj;
    })
    .filter(function (o) { return o.id !== '' && o.id !== undefined && o.id !== null; });
}

function seedCategoriasSiVacio(catSheet) {
  if (catSheet.getLastRow() >= 2) return;
  Object.keys(CATEGORIAS_DEFAULT).forEach(function (tipo) {
    CATEGORIAS_DEFAULT[tipo].forEach(function (nombre) {
      catSheet.appendRow([tipo, nombre]);
    });
  });
}

function getAll() {
  const movSheet = getSheet(SHEETS.MOV, MOV_HEADERS);
  const empSheet = getSheet(SHEETS.EMP, EMP_HEADERS);
  const catSheet = getSheet(SHEETS.CAT, CAT_HEADERS);
  seedCategoriasSiVacio(catSheet);

  const tz = Session.getScriptTimeZone();
  const movimientos = rowsToObjects(movSheet, MOV_HEADERS).map(function (m) {
    if (m.fecha instanceof Date) m.fecha = Utilities.formatDate(m.fecha, tz, 'yyyy-MM-dd');
    m.monto = Number(m.monto);
    return m;
  });
  const empleados = rowsToObjects(empSheet, EMP_HEADERS).map(function (e) {
    e.sueldo = Number(e.sueldo);
    return e;
  });
  const catRows = rowsToObjects(catSheet, CAT_HEADERS);
  const categorias = {};
  catRows.forEach(function (c) {
    if (!categorias[c.tipo]) categorias[c.tipo] = [];
    categorias[c.tipo].push(c.nombre);
  });

  return { movimientos: movimientos, empleados: empleados, categorias: categorias };
}

function nuevoId(prefijo) {
  return prefijo + '_' + new Date().getTime() + '_' + Math.floor(Math.random() * 1000);
}

function addMovimiento(data) {
  const sheet = getSheet(SHEETS.MOV, MOV_HEADERS);
  const id = nuevoId('m');
  const row = MOV_HEADERS.map(function (h) {
    if (h === 'id') return id;
    return data[h] !== undefined ? data[h] : '';
  });
  sheet.appendRow(row);
  data.id = id;
  return data;
}

function addEmpleado(data) {
  const sheet = getSheet(SHEETS.EMP, EMP_HEADERS);
  const id = nuevoId('e');
  const row = EMP_HEADERS.map(function (h) {
    if (h === 'id') return id;
    return data[h] !== undefined ? data[h] : '';
  });
  sheet.appendRow(row);
  data.id = id;
  return data;
}

function deleteRowById(sheetName, headers, id) {
  const sheet = getSheet(sheetName, headers);
  const idCol = headers.indexOf('id') + 1;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { deleted: false };
  const ids = sheet.getRange(2, idCol, lastRow - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) {
      sheet.deleteRow(i + 2);
      return { deleted: true };
    }
  }
  return { deleted: false };
}

function addCategoria(tipo, nombre) {
  const sheet = getSheet(SHEETS.CAT, CAT_HEADERS);
  const lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    const values = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
    for (let i = 0; i < values.length; i++) {
      if (values[i][0] === tipo && values[i][1] === nombre) return { added: false, reason: 'ya existe' };
    }
  }
  sheet.appendRow([tipo, nombre]);
  return { added: true };
}

function deleteCategoria(tipo, nombre) {
  const sheet = getSheet(SHEETS.CAT, CAT_HEADERS);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { deleted: false };
  const values = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  for (let i = 0; i < values.length; i++) {
    if (values[i][0] === tipo && values[i][1] === nombre) {
      sheet.deleteRow(i + 2);
      return { deleted: true };
    }
  }
  return { deleted: false };
}
