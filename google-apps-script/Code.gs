/**
 * Tach Racing — Caja & Bancos
 * Backend en Google Apps Script para conectar la app web con Google Sheets.
 *
 * Cómo instalarlo: ver SETUP_GOOGLE_SHEETS.md en la raíz del repo.
 */

const SHEETS = {
  MOV: 'Movimientos',
  EMP: 'Empleados',
  CAT: 'Categorias',
  ARQ: 'Arqueos'
};

const MOV_HEADERS = ['id', 'tipo', 'fecha', 'monto', 'moneda', 'descripcion', 'cuenta', 'cuentaOrigen', 'cuentaDestino', 'categoria', 'empleado', 'socio', 'subTipo'];
const EMP_HEADERS = ['id', 'nombre', 'cargo', 'sueldo'];
const CAT_HEADERS = ['tipo', 'nombre'];
const ARQ_HEADERS = ['id', 'fecha', 'cuenta', 'saldoSistema', 'saldoReal', 'diferencia', 'nota', 'ajustado', 'movimientoId'];

const CATEGORIAS_DEFAULT = {
  ingreso: ['Ventas', 'Servicios', 'Otros ingresos', 'Ajuste de caja'],
  egreso: ['Combustible', 'Alquiler', 'Impuestos', 'Marketing', 'Logística', 'Mantenimiento', 'Repuestos', 'Otros', 'Ajuste de caja'],
  aporte: ['Aporte entrada', 'Retiro/extracción', 'Capital propio']
};

/**
 * Todo pasa por doGet (incluidas las escrituras) para evitar los problemas de
 * CORS que Apps Script tiene con fetch() desde un sitio en otro dominio.
 * Si el pedido trae "callback", se responde en formato JSONP (que no está
 * sujeto a CORS porque se carga como un <script>, no como fetch/XHR).
 */
function doGet(e) {
  const p = e.parameter;
  const action = p.action;
  let out;
  try {
    let result;
    switch (action) {
      case 'getAll':
        result = getAll();
        break;
      case 'addMovimiento':
        result = addMovimiento(JSON.parse(p.data));
        break;
      case 'deleteMovimiento':
        result = deleteRowById(SHEETS.MOV, MOV_HEADERS, p.id);
        break;
      case 'addEmpleado':
        result = addEmpleado(JSON.parse(p.data));
        break;
      case 'deleteEmpleado':
        result = deleteRowById(SHEETS.EMP, EMP_HEADERS, p.id);
        break;
      case 'addCategoria':
        result = addCategoria(p.tipo, p.nombre);
        break;
      case 'deleteCategoria':
        result = deleteCategoria(p.tipo, p.nombre);
        break;
      case 'addArqueo':
        result = addArqueo(JSON.parse(p.data));
        break;
      case 'deleteArqueo':
        result = deleteRowById(SHEETS.ARQ, ARQ_HEADERS, p.id);
        break;
      default:
        out = { ok: false, error: 'Acción desconocida: ' + action };
        return respond(out, p.callback);
    }
    out = { ok: true, result: result };
  } catch (err) {
    out = { ok: false, error: err.message };
  }
  return respond(out, p.callback);
}

function respond(obj, callback) {
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + JSON.stringify(obj) + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
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
  const arqSheet = getSheet(SHEETS.ARQ, ARQ_HEADERS);
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
  const arqueos = rowsToObjects(arqSheet, ARQ_HEADERS).map(function (a) {
    if (a.fecha instanceof Date) a.fecha = Utilities.formatDate(a.fecha, tz, 'yyyy-MM-dd');
    a.saldoSistema = Number(a.saldoSistema);
    a.saldoReal = Number(a.saldoReal);
    a.diferencia = Number(a.diferencia);
    a.ajustado = (a.ajustado === true || a.ajustado === 'true');
    return a;
  });

  return { movimientos: movimientos, empleados: empleados, categorias: categorias, arqueos: arqueos };
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

function addArqueo(data) {
  const sheet = getSheet(SHEETS.ARQ, ARQ_HEADERS);
  const id = nuevoId('a');
  const row = ARQ_HEADERS.map(function (h) {
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
