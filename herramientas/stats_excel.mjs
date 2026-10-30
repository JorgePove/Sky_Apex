/* Crea (o amplía) el Excel de stats de Sky Apex: datos/sky_apex_stats.xlsx (v24).
   Lo que hay en cada pestaña sale de STATS_SCHEMA y STATS_TABS (fuentes/sky_apex/19c_stats.js), el mismo esquema que usa el juego.
   Si el Excel ya existe, conserva los valores que tenga (por pestaña y clave): un número se queda como está y una fórmula de un dragón
   vuelve a ser «igual que la Base». Sirve para añadir stats o pestañas nuevas sin perder lo que Jorge haya cambiado; el formato a mano
   (colores, notas, columnas propias) sí se pierde. Antes de sobrescribir, guarda una copia en herramientas/salida/.
   Uso: node herramientas/stats_excel.mjs */
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';
import ExcelJS from 'exceljs';

const HERR = path.dirname(fileURLToPath(import.meta.url)), RAIZ = path.resolve(HERR, '..');
const S = cargarEsquema();
const ARCHIVO = path.join(RAIZ, S.STATS_FILE);

/* El esquema y el lector del juego: la parte de arriba de 19c_stats.js no toca nada del juego, así que se puede ejecutar aquí. */
export function cargarEsquema() {
  const code = fs.readFileSync(path.join(HERR, '..', 'fuentes', 'sky_apex', '19c_stats.js'), 'utf8');
  const fin = code.indexOf('/* ---------- En el juego ---------- */');
  return new Function(code.slice(0, fin) + '\nreturn { STATS_FILE, STATS_SCHEMA, STATS_TABS, xlsxSheets, statsFromSheets, statsResolve };')();
}
export const inflar = u8 => new Uint8Array(zlib.inflateRawSync(u8));

/* Valores que ya hay en el Excel: { pestaña normalizada: { clave: { v, f } } } (f = la celda es una fórmula). */
async function valoresActuales() {
  if (!fs.existsSync(ARCHIVO)) return null;
  const hojas = await S.xlsxSheets(fs.readFileSync(ARCHIVO), inflar), out = {};
  const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const [nombre, filas] of Object.entries(hojas)) {
    let h = 0, ck = -1, cv = -1;
    for (; h < Math.min(filas.length, 15); h++) {
      const r = filas[h] || [];
      ck = r.findIndex(x => typeof x === 'string' && norm(x) === 'clave'); cv = r.findIndex(x => typeof x === 'string' && norm(x) === 'valor');
      if (ck >= 0 && cv >= 0) break;
    }
    if (ck < 0 || cv < 0) continue;
    const o = out[norm(nombre)] = {};
    for (let i = h + 1; i < filas.length; i++) {
      const r = filas[i], k = r && r[ck];
      if (typeof k === 'string' && k.trim()) o[k.trim()] = { v: r[cv], f: (i + ',' + cv) in filas.f };
    }
  }
  return { out, norm };
}

const COL = { tinta: 'FF2B2118', gris: 'FF8A7F74', claro: 'FFB9B0A6', valor: 'FFFFF4CC', seccion: 'FF3A2A20', seccionTxt: 'FFF2B84B', cabecera: 'FFEFE6D8', borde: 'FFD9CFC2', cambio: 'FFC0501A', cambioFondo: 'FFFFE3CC' };
const fuente = (o = {}) => ({ name: 'Calibri', size: 11, color: { argb: COL.tinta }, ...o });
const relleno = argb => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
const borde = { bottom: { style: 'thin', color: { argb: COL.borde } } };

async function main() {
  const prev = await valoresActuales();
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Sky Apex'; wb.created = new Date(); wb.calcProperties.fullCalcOnLoad = true;
  const dragones = S.STATS_TABS.filter(t => t.kind === 'dragon' && t.unit !== 'base');
  const def = (T, fila) => {                               // valor de una fila: el del Excel anterior si lo había; si no, el del esquema
    const old = prev && prev.out[prev.norm(T.tab)] && prev.out[prev.norm(T.tab)][fila[0]];
    return old && typeof old.v === 'number' ? old : null;
  };
  const baseVal = {};                                      // valor de la Base por clave (para los resultados guardados de las fórmulas)
  const T0 = S.STATS_TABS.find(t => t.unit === 'base');
  for (const f of S.STATS_SCHEMA.dragon) if (Array.isArray(f)) { const o = def(T0, f); baseVal[f[0]] = o ? o.v : f[3]; }

  // Léeme
  const L = wb.addWorksheet('Léeme', { properties: { tabColor: { argb: 'FFF2B84B' } }, views: [{ showGridLines: false }] });
  L.getColumn(1).width = 4; L.getColumn(2).width = 120;
  const lineas = [
    ['t', 'Sky Apex · Stats de las unidades'],
    ['', 'El juego lee todas las stats de este Excel: los dragones del jugador, los enemigos y Lance. Cambia un valor, guarda (Ctrl+G) y el juego lo usa.'],
    ['h', 'Qué se puede cambiar'],
    ['', '• Solo la columna «Valor» (en amarillo) de cada pestaña.'],
    ['', '• Base: los valores base de todos los dragones del jugador.'],
    ['', '• Alientormenta, Abrasanubes, Ventoscuro y Fulgor: su «Valor» copia el de la Base (es una fórmula) hasta que escribas otro número; esa es su variación.'],
    ['', '   «Diferencia» dice cuánto se aparta de la Base, y el valor se pone en naranja. Para volver a la Base, escribe en la celda: =Base!B<fila> (o copia la de otra fila).'],
    ['', '• Comparativa: los cuatro dragones y la Base lado a lado (solo para mirar; se rellena sola). En naranja, lo que cambia respecto a la Base.'],
    ['', '• Dragón enemigo, Torre, Dirigible y Lance (aliado): sus valores de ahora, pendientes de rediseñar.'],
    ['', '• Artillería, Batallón, Barco naval, Superdirigible y Sierpe (v29): los enemigos nuevos, con valores provisionales para ajustarlos en la galería de enemigos.'],
    ['', '• En gris: ajustes que no estaban en la lista de stats; tienen los valores que ya usaba el juego.'],
    ['h', 'Qué no hay que cambiar'],
    ['', '• Los nombres de las pestañas y la columna «Clave» (es como el juego reconoce cada stat). Si falta una clave, el juego usa el valor de la Base o el de siempre y lo avisa.'],
    ['', '• Se pueden añadir notas en columnas nuevas, colores o comentarios: el juego solo lee «Valor» y «Clave».'],
    ['h', 'Cómo ver los cambios en el juego'],
    ['', '• Abre el juego con Jugar.bat (en la carpeta del proyecto). Lee el Excel al abrirse y lo vigila: al guardar, los valores nuevos se aplican en un par de segundos, incluso en pleno vuelo («Stats actualizadas desde el Excel»).'],
    ['', '• Con doble clic en sky_apex.html, el navegador no deja leer el Excel: usa la copia que se guardó en el HTML la última vez que se construyó (node herramientas/construir.mjs).'],
    ['', '• En la web de GitHub, el Excel que se subió con el último push.'],
    ['', '• En el juego, Opciones → «Stats de las unidades» dice de dónde salen las que se están usando.'],
    ['h', 'Unidades'],
    ['', 'Velocidades de dragones en km/h; de proyectiles, en m/s. Distancias en m (el rayo, en km). Tiempos en s. Recargas en % de la barra por segundo.']
  ];
  lineas.forEach(([tipo, txt], i) => {
    const c = L.getCell(i + 2, 2); c.value = txt; c.alignment = { wrapText: true, vertical: 'top' };
    c.font = tipo === 't' ? fuente({ size: 18, bold: true }) : tipo === 'h' ? fuente({ size: 12, bold: true, color: { argb: 'FFC0501A' } }) : fuente();
    if (tipo === 'h') L.getRow(i + 2).height = 24;
  });

  // Comparativa (se rellena después de saber qué fila ocupa cada clave)
  const C = wb.addWorksheet('Comparativa', { properties: { tabColor: { argb: 'FF7A6A5A' } }, views: [{ state: 'frozen', ySplit: 4, xSplit: 1 }] });

  const filaDe = {};                                       // clave → fila (la misma en la Base, en cada dragón y en la Comparativa)
  const hoja = (T) => {
    const dr = T.kind === 'dragon' && T.unit !== 'base';
    const ws = wb.addWorksheet(T.tab, { properties: { tabColor: { argb: T.kind === 'dragon' ? (dr ? 'FFC0501A' : 'FFF2B84B') : 'FF5A6E8A' } }, views: [{ state: 'frozen', ySplit: 4 }] });
    const cols = dr ? ['Stat', 'Valor', 'Unidad', 'Base', 'Diferencia', 'Descripción', 'Clave'] : ['Stat', 'Valor', 'Unidad', 'Descripción', 'Clave'];
    const ancho = { Stat: 40, Valor: 12, Unidad: 18, Base: 10, Diferencia: 12, 'Descripción': 90, Clave: 22 };
    cols.forEach((n, j) => { ws.getColumn(j + 1).width = ancho[n]; });
    const ci = n => cols.indexOf(n) + 1;
    ws.mergeCells(1, 1, 1, cols.length); ws.getCell(1, 1).value = T.tab; ws.getCell(1, 1).font = fuente({ size: 18, bold: true }); ws.getRow(1).height = 28;
    ws.mergeCells(2, 1, 2, cols.length);
    ws.getCell(2, 1).value = T.note ? T.note : T.unit === 'base' ? 'Valores base de los dragones del jugador. Cada dragón los copia salvo los que cambies en su pestaña.'
      : dr ? 'Dragón del jugador. «Valor» sigue a la Base hasta que escribas otro número (su variación, en naranja).'
        : T.unit === 'lance' ? 'Compañero de escuadrón con IA (Misión 1). Valores de ahora, pendientes de rediseñar.' : 'Valores de ahora, pendientes de rediseñar.';
    ws.getCell(2, 1).font = fuente({ italic: true, color: { argb: COL.gris } });
    const hr = ws.getRow(4); cols.forEach((n, j) => { const c = hr.getCell(j + 1); c.value = n; c.font = fuente({ bold: true }); c.fill = relleno(COL.cabecera); c.border = borde; });
    ws.getCell(4, ci('Clave')).font = fuente({ bold: true, color: { argb: COL.gris } });
    let r = 5;
    for (const f of S.STATS_SCHEMA[T.kind]) {
      if (!Array.isArray(f)) {                              // sección
        ws.mergeCells(r, 1, r, cols.length);
        const c = ws.getCell(r, 1); c.value = f.sec; c.font = fuente({ bold: true, color: { argb: COL.seccionTxt } }); c.fill = relleno(COL.seccion);
        ws.getRow(r).height = 20; r++; continue;
      }
      const [k, nombre, unidad, porDefecto, desc, extra] = f, row = ws.getRow(r);
      if (T.kind === 'dragon') filaDe[k] = r;
      row.getCell(1).value = nombre; row.getCell(1).font = fuente(extra ? { color: { argb: COL.gris }, italic: true } : {});
      const old = def(T, f), cv = row.getCell(ci('Valor'));
      if (dr) {
        const base = baseVal[k];
        cv.value = old && !old.f ? old.v : { formula: 'Base!B' + r, result: base };
        row.getCell(ci('Base')).value = { formula: 'Base!B' + r, result: base };
        row.getCell(ci('Base')).font = fuente({ color: { argb: COL.gris } });
        const val = old && !old.f ? old.v : base;
        const cd = row.getCell(ci('Diferencia'));
        cd.value = { formula: `IF(D${r}=0,"",B${r}/D${r}-1)`, result: base ? val / base - 1 : '' };
        cd.numFmt = '+0%;-0%;"="'; cd.font = fuente({ color: { argb: COL.gris } }); cd.alignment = { horizontal: 'center' };
      } else cv.value = old ? old.v : porDefecto;
      cv.fill = relleno(COL.valor); cv.font = fuente({ bold: true }); cv.alignment = { horizontal: 'center' };
      row.getCell(ci('Unidad')).value = unidad; row.getCell(ci('Unidad')).font = fuente({ color: { argb: COL.gris } });
      const cdsc = row.getCell(ci('Descripción')); cdsc.value = desc || ''; cdsc.alignment = { wrapText: true, vertical: 'top' }; cdsc.font = fuente({ size: 10, color: { argb: 'FF5A4E44' } });
      row.getCell(ci('Clave')).value = k; row.getCell(ci('Clave')).font = fuente({ size: 9, color: { argb: COL.claro } });
      for (let j = 1; j <= cols.length; j++) row.getCell(j).border = borde;
      r++;
    }
    if (dr) ws.addConditionalFormatting({ ref: `B5:B${r - 1}`, rules: [{ type: 'expression', formulae: ['AND(ISNUMBER(D5),B5<>D5)'], style: { font: { color: { argb: COL.cambio }, bold: true }, fill: relleno(COL.cambioFondo) } }] });
    return r;
  };
  let ultima = 0;
  for (const T of S.STATS_TABS) { const r = hoja(T); if (T.kind === 'dragon') ultima = r; }

  // Comparativa: Base y los cuatro dragones, fila a fila (fórmulas a cada pestaña)
  const ccols = ['Stat', 'Unidad', 'Base', ...dragones.map(t => t.tab)];
  ccols.forEach((n, j) => { C.getColumn(j + 1).width = j === 0 ? 40 : j === 1 ? 14 : 15; });
  C.mergeCells(1, 1, 1, ccols.length); C.getCell(1, 1).value = 'Comparativa de los dragones'; C.getCell(1, 1).font = fuente({ size: 18, bold: true }); C.getRow(1).height = 28;
  C.mergeCells(2, 1, 2, ccols.length); C.getCell(2, 1).value = 'Solo para mirar: se rellena sola con las pestañas de cada dragón. En naranja, lo que cambia respecto a la Base.';
  C.getCell(2, 1).font = fuente({ italic: true, color: { argb: COL.gris } });
  const ch = C.getRow(4); ccols.forEach((n, j) => { const c = ch.getCell(j + 1); c.value = n; c.font = fuente({ bold: true }); c.fill = relleno(COL.cabecera); c.border = borde; c.alignment = { horizontal: j > 1 ? 'center' : 'left' }; });
  let r = 5;
  for (const f of S.STATS_SCHEMA.dragon) {
    if (!Array.isArray(f)) {
      C.mergeCells(r, 1, r, ccols.length); const c = C.getCell(r, 1); c.value = f.sec; c.font = fuente({ bold: true, color: { argb: COL.seccionTxt } }); c.fill = relleno(COL.seccion);
      C.getRow(r).height = 20; r++; continue;
    }
    const [k, nombre, unidad, , , extra] = f, row = C.getRow(r);
    row.getCell(1).value = nombre; row.getCell(1).font = fuente(extra ? { color: { argb: COL.gris }, italic: true } : {});
    row.getCell(2).value = unidad; row.getCell(2).font = fuente({ color: { argb: COL.gris } });
    row.getCell(3).value = { formula: `Base!B${r}`, result: baseVal[k] }; row.getCell(3).font = fuente({ bold: true });
    dragones.forEach((T, j) => {
      const old = def(T, f), c = row.getCell(4 + j);
      c.value = { formula: `'${T.tab}'!B${r}`, result: old && !old.f ? old.v : baseVal[k] }; c.alignment = { horizontal: 'center' };
    });
    row.getCell(3).alignment = { horizontal: 'center' };
    for (let j = 1; j <= ccols.length; j++) row.getCell(j).border = borde;
    r++;
  }
  const ult = String.fromCharCode(64 + ccols.length);
  C.addConditionalFormatting({ ref: `D5:${ult}${r - 1}`, rules: [{ type: 'expression', formulae: ['AND(ISNUMBER($C5),D5<>$C5)'], style: { font: { color: { argb: COL.cambio }, bold: true }, fill: relleno(COL.cambioFondo) } }] });
  if (ultima !== r) throw new Error('La Comparativa no cuadra con las pestañas de los dragones');

  fs.mkdirSync(path.dirname(ARCHIVO), { recursive: true });
  if (fs.existsSync(ARCHIVO)) {
    const sal = path.join(HERR, 'salida'); fs.mkdirSync(sal, { recursive: true });
    const copia = path.join(sal, 'sky_apex_stats_' + new Date().toISOString().replace(/[:.]/g, '-') + '.xlsx');
    fs.copyFileSync(ARCHIVO, copia); console.log('Copia del anterior: ' + path.relative(RAIZ, copia));
  }
  await wb.xlsx.writeFile(ARCHIVO);
  // comprobación: el lector del juego tiene que leer lo mismo
  const leido = S.statsFromSheets(await S.xlsxSheets(fs.readFileSync(ARCHIVO), inflar));
  const n = Object.values(leido).reduce((a, o) => a + Object.keys(o).length, 0);
  const { miss } = S.statsResolve(leido);
  console.log(`Excel: ${path.relative(RAIZ, ARCHIVO)} · ${Object.keys(leido).length} pestañas de unidades, ${n} valores` + (miss.length ? ` · FALTAN: ${miss.join(', ')}` : ''));
  if (miss.length) process.exit(1);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(err => { console.error(err); process.exit(1); });
