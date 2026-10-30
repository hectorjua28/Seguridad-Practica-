const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, ShadingType, ImageRun, BorderStyle, AlignmentType, PageBreak,
  Header, Footer, PageNumber, NumberFormat, convertInchesToTwip, TableOfContents,
  VerticalAlign, ExternalHyperlink
} = require('docx');

const EV = path.join(__dirname, '..', 'evidencias');
const MAN = JSON.parse(fs.readFileSync(path.join(EV, 'manifest.json'), 'utf8'));
const RES_V1 = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'pruebas', 'salida', 'v1-original', 'resultados.json'), 'utf8'));
const RES_V2 = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'pruebas', 'salida', 'v2-corregida', 'resultados.json'), 'utf8'));

const COLOR = {
  verde: '2E7D32', verdeClaro: 'E8F5E9', rojo: 'C62828', rojoClaro: 'FDECEA',
  naranja: 'EF6C00', naranjaClaro: 'FFF3E0', azul: '1565C0', azulClaro: 'E3F2FD',
  gris: '616161', grisClaro: 'F2F2F2', negro: '212121', ribbon: '2E4057'
};

function img(name, w, h) {
  const m = MAN[name];
  return new ImageRun({ type: 'png', data: fs.readFileSync(path.join(EV, name)), transformation: { width: w || m.tw, height: h || m.th } });
}
function p(text, opts = {}) {
  const { bold, italics, size, color, align, spacingBefore, spacingAfter, heading } = opts;
  return new Paragraph({
    heading,
    alignment: align,
    spacing: { before: spacingBefore ?? 0, after: spacingAfter ?? 120 },
    children: [new TextRun({ text, bold, italics, size, color })],
  });
}
function bullet(text, opts = {}) {
  return new Paragraph({ bullet: { level: 0 }, spacing: { after: 80 }, children: [new TextRun({ text, ...opts })] });
}
function h1(text) { return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 }, children: [new TextRun({ text })] }); }
function h2(text) { return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 160 }, children: [new TextRun({ text })] }); }
function h3(text) { return new Paragraph({ heading: HeadingLevel.HEADING_3, spacing: { before: 220, after: 120 }, children: [new TextRun({ text })] }); }

function cell(children, opts = {}) {
  const { width, shade, bold, align, valign, borders } = opts;
  return new TableCell({
    width: width ? { size: width, type: WidthType.DXA } : undefined,
    shading: shade ? { type: ShadingType.CLEAR, color: 'auto', fill: shade } : undefined,
    verticalAlign: valign || VerticalAlign.CENTER,
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    children: Array.isArray(children) ? children : [typeof children === 'string'
      ? new Paragraph({ alignment: align, children: [new TextRun({ text: children, bold })] })
      : children],
  });
}
function txtCell(text, width, opts = {}) { return cell(text, { width, ...opts }); }

function riskBadge(nivel) {
  const map = { 'Crítico': COLOR.rojoClaro, 'Alto': 'FFE0B2', 'Medio': COLOR.naranjaClaro, 'Bajo': COLOR.verdeClaro };
  const fg = { 'Crítico': COLOR.rojo, 'Alto': 'E65100', 'Medio': COLOR.naranja, 'Bajo': COLOR.verde };
  return new TableCell({
    width: { size: 1600, type: WidthType.DXA },
    shading: { type: ShadingType.CLEAR, color: 'auto', fill: map[nivel] },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: nivel, bold: true, color: fg[nivel] })] })],
  });
}

const TBL_BORDERS = {
  top: { style: BorderStyle.SINGLE, size: 2, color: 'BDBDBD' }, bottom: { style: BorderStyle.SINGLE, size: 2, color: 'BDBDBD' },
  left: { style: BorderStyle.SINGLE, size: 2, color: 'BDBDBD' }, right: { style: BorderStyle.SINGLE, size: 2, color: 'BDBDBD' },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: 'BDBDBD' }, insideVertical: { style: BorderStyle.SINGLE, size: 2, color: 'BDBDBD' },
};
function table(rows, colWidths) {
  return new Table({ width: { size: 9350, type: WidthType.DXA }, columnWidths: colWidths, borders: TBL_BORDERS, rows });
}

function headerRow(cells, widths) {
  return new TableRow({ tableHeader: true, children: cells.map((t, i) => txtCell(t, widths[i], { shade: COLOR.ribbon, bold: true, align: AlignmentType.CENTER })) });
}

function evidencePair(tituloAntes, antesImg, tituloDespues, despuesImg) {
  const a = MAN[antesImg], d = MAN[despuesImg];
  return new Table({
    width: { size: 9350, type: WidthType.DXA },
    columnWidths: [4675, 4675],
    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE } },
    rows: [new TableRow({ children: [
      new TableCell({ width: { size: 4675, type: WidthType.DXA }, margins: { top: 60, bottom: 60, left: 40, right: 80 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [img(antesImg, 260, Math.round(260 * a.h / a.w))] })] }),
      new TableCell({ width: { size: 4675, type: WidthType.DXA }, margins: { top: 60, bottom: 60, left: 80, right: 40 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [img(despuesImg, 260, Math.round(260 * d.h / d.w))] })] }),
    ] })],
  });
}

// ------------------------------------------------------------------
// Datos de hallazgos
// ------------------------------------------------------------------
const HALLAZGOS = [
  {
    id: 'VULN-01', titulo: 'Inyección SQL (bypass de autenticación y exfiltración vía UNION)',
    grupo: 'MASVS-CODE (primario) · MASVS-AUTH (secundario)',
    ubicacion: 'scripts/login.php (consulta de login); scripts/load_events.php, scripts/obtener_eventos.php (parámetro "mes"); scripts/lista_usuarios.php, lista_eventos.php, lista_categoria.php (parámetro "pagina"); scripts/registro_usuario.php, editar_usuario.php, registro_categoria.php, editar_categoria.php (correo/descripción)',
    reproduccion: [
      'Enviar POST a scripts/login.php con email = pass = x\' OR \'1\'=\'1',
      'El servidor concatena el valor directamente en el SQL y la condición siempre es verdadera: se inicia sesión sin conocer ninguna credencial.',
      'Autenticado como un usuario cualquiera, enviar GET a scripts/load_events.php?mes=0 UNION SELECT ID_us,Name_us,password_us,... FROM users -- para leer los hashes de contraseña de todos los usuarios a través de una vista pensada solo para listar eventos del mes.',
    ],
    evidenciaId: 'P-01a / P-01b', probabilidad: 3, impacto: 3, riesgo: 'Crítico',
    correccion: 'Se sustituyeron todas las consultas que concatenaban entrada del usuario por sentencias preparadas (mysqli prepare/bind_param) y se forzó el tipo numérico (int) en parámetros como "mes", "pagina" e "id" antes de usarlos en SQL. El login quedó centralizado en includes/auth.php::authenticate().',
  },
  {
    id: 'VULN-02', titulo: 'Control de acceso roto en funciones administrativas',
    grupo: 'MASVS-AUTH (primario) · MASVS-PLATFORM (secundario)',
    ubicacion: 'scripts/lista_usuarios.php, eliminar_usuario.php, editar_usuario.php, registro_usuario.php, lista_categoria.php, eliminar_categoria.php, registro_categoria.php, editar_categoria.php, lista_eventos.php, eliminar_confirmar_evento.php, registro_evento.php, editar_evento.php, paginas/admin.php',
    reproduccion: [
      'Sin iniciar sesión, solicitar GET scripts/lista_usuarios.php: la lista completa de usuarios (nombre y correo) se muestra igualmente.',
      'Sin iniciar sesión, enviar POST a scripts/eliminar_usuario.php?id=3: el usuario se elimina de la base de datos sin pedir ninguna credencial.',
      'Sin iniciar sesión, enviar POST a scripts/editar_usuario.php?id=2 con una contraseña nueva: la contraseña de ese usuario queda sobrescrita (toma de cuenta) y el atacante puede iniciar sesión con la clave que impuso.',
      'Con sesión de un usuario normal (no administrador), acceder a scripts/lista_usuarios.php: el panel administrativo se muestra igual porque ningún script valida el rol.',
    ],
    evidenciaId: 'P-02a / P-02b / P-02c / P-02d', probabilidad: 3, impacto: 3, riesgo: 'Crítico',
    correccion: 'Se creó includes/auth.php con require_login() y require_admin(); los 14 scripts administrativos ahora exigen sesión y rol de administrador (es_admin, calculado en el servidor a partir de ADMIN_EMAIL) antes de ejecutar cualquier lectura o escritura.',
  },
  {
    id: 'VULN-03', titulo: 'Hash de contraseñas débil (MD5 sin sal)',
    grupo: 'MASVS-CRYPTO (primario) · MASVS-STORAGE (secundario)',
    ubicacion: 'scripts/registro.php, scripts/registro_usuario.php (alta de usuarios vía panel admin)',
    reproduccion: [
      'Registrar un usuario desde scripts/registro_usuario.php y consultar la columna password_us en la base de datos.',
      'El valor es un hash MD5 de 32 caracteres hexadecimales, sin sal: reversible en segundos con un diccionario o una tabla arcoíris si la base de datos llegara a filtrarse.',
      'Nota: el formulario público de registro (paginas/registro.php) sí usaba password_hash()/bcrypt desde el original; el problema estaba acotado al alta hecha por el administrador y a la clase legada Registro.',
    ],
    evidenciaId: 'P-03a / P-03b', probabilidad: 2, impacto: 2, riesgo: 'Medio',
    correccion: 'Se reemplazó md5() por password_hash($clave, PASSWORD_DEFAULT) (bcrypt) en todos los puntos de alta/edición. Se añadió además una migración transparente: si una cuenta antigua todavía tiene un hash MD5, el primer login correcto lo valida una vez y lo reemplaza por bcrypt automáticamente.',
  },
  {
    id: 'VULN-04', titulo: 'Subida de archivos sin validar (ejecución remota de código)',
    grupo: 'MASVS-CODE (primario) · MASVS-PLATFORM (secundario)',
    ubicacion: 'scripts/registro_evento.php, scripts/editar_evento.php (campo "foto")',
    reproduccion: [
      'Con una cuenta normal (registro público, sin privilegios de administrador), crear un evento adjuntando un archivo "shell.php" cuyo contenido es <?php echo \'RCE_\'.(6*7); ?>.',
      'La aplicación solo valida $foto[\'error\'] y mueve el archivo a fotos/ conservando el nombre y la extensión que envía el navegador, sin comprobar el tipo de contenido real.',
      'Visitar directamente fotos/shell.php: el servidor interpreta el archivo como PHP y ejecuta el código (salida "RCE_42"), lo que equivale a ejecución remota de código con los permisos del servidor web.',
    ],
    evidenciaId: 'P-04a / P-04b / P-04c', probabilidad: 3, impacto: 3, riesgo: 'Crítico',
    correccion: 'Se añadió includes/upload.php::guardar_foto_evento(): valida que el archivo provenga de una subida real (is_uploaded_file), limita el tamaño, verifica el tipo MIME real con fileinfo (no el que declara el navegador) contra una lista blanca de imágenes, confirma con getimagesize() que el contenido es una imagen válida, y lo guarda con un nombre aleatorio y una extensión derivada del MIME (nunca la del cliente). Se agregó además fotos/.htaccess que desactiva la ejecución de PHP en esa carpeta como defensa en profundidad.',
  },
  {
    id: 'VULN-05', titulo: 'Credenciales y secretos embebidos en el código fuente',
    grupo: 'MASVS-STORAGE (primario) · MASVS-CODE (secundario)',
    ubicacion: 'scripts/conexion.php, bd_php/conexion.php, scripts/login.php, scripts/add_comment.php, scripts/evento_detalle.php, scripts/registro_evento.php, scripts/editar_evento.php, paginas/login.php, paginas/registro.php, index.php, scripts/load_events.php, scripts/obtener_eventos.php, scripts/eventos.php, scripts/registro.php, bd_php/usuarioBD.php',
    reproduccion: [
      'Buscar en el código fuente la cadena new mysqli("localhost","root","",...): aparece repetida en 14 archivos, con el usuario root y la contraseña vacía escritos de forma literal.',
      'bd_php/usuarioBD.php tenía además error_reporting(E_ALL) + ini_set("display_errors",1) y mostraba el mensaje de excepción de MySQL directamente al usuario (die("Error de conexión: " . $e->getMessage())), lo que expone detalles internos (rutas, nombres de tabla, versión de MySQL) a cualquier visitante.',
      'El proyecto no incluía archivo .gitignore, por lo que un futuro archivo de configuración con credenciales reales se habría subido al repositorio sin control.',
    ],
    evidenciaId: 'P-05a / P-05b / P-05c', probabilidad: 2, impacto: 2, riesgo: 'Medio',
    correccion: 'Se centralizó la conexión en includes/db.php + includes/config.php, que leen host/usuario/clave/BD desde variables de entorno o desde includes/config.local.php (archivo que no se sube al repositorio). Los errores de conexión y de consulta ahora se registran con error_log() y al usuario solo se le muestra un mensaje genérico. Se agregó .gitignore excluyendo config.local.php, *.env y los registros temporales de prueba.',
  },
  {
    id: 'VULN-06', titulo: 'Gestión insegura de sesión (cookie sin protecciones, fijación de sesión, enumeración de usuarios y cierre de sesión incompleto)',
    grupo: 'MASVS-AUTH (primario)',
    ubicacion: 'scripts/login.php, paginas/login.php, scripts/cerrar_sesion.php, includes/header.php, includes/nav.php',
    reproduccion: [
      'Al iniciar sesión, la cabecera Set-Cookie del PHPSESSID no incluye HttpOnly ni SameSite, y el identificador de sesión es el mismo que tenía el visitante antes de autenticarse (no se llama a session_regenerate_id()), lo que permite fijación de sesión: un atacante que induce a la víctima a usar un ID de sesión conocido (por ejemplo vía enlace) puede reutilizar ese mismo ID después de que la víctima inicie sesión.',
      'El login devuelve mensajes distintos para "correo no existe" y "contraseña incorrecta", lo que permite enumerar qué correos están registrados probando uno por uno.',
      'scripts/cerrar_sesion.php llama a session_destroy() pero nunca borra la cookie del navegador (no hay setcookie(...,-1)), por lo que el ID de sesión sigue viajando en cada petición aunque ya no tenga datos asociados.',
      'El rol de administrador se decide comparando el correo contra un valor fijo dentro de includes/nav.php, repetido en cada archivo en vez de calcularse una sola vez en el servidor al autenticar.',
    ],
    evidenciaId: 'P-06a / P-06b / P-06c / P-06d', probabilidad: 2, impacto: 2, riesgo: 'Medio',
    correccion: 'Se creó includes/session.php: cookie de sesión con HttpOnly, SameSite=Lax y Secure quién corresponda según HTTPS; expiración por inactividad (30 min); session_regenerate_id(true) en cada login (evita fijación); logout_user() que vacía $_SESSION, destruye la sesión en el servidor y expira la cookie en el navegador. El login ahora responde siempre "Credenciales incorrectas" sin distinguir el motivo, y el rol es_admin se calcula una única vez en el servidor al autenticar.',
  },
];

const CHECKLIST = [
  ['STORAGE', 'Credenciales embebidas, gestión de secretos, errores detallados expuestos, exclusión de secretos de Git.', 'NC', 'VULN-05 (P-05a/b/c) — corregido, ver reprueba 24/24.'],
  ['CRYPTO', 'Algoritmo de hash para contraseñas, generación de nombres de archivo/identificadores.', 'NC', 'VULN-03 (P-03a/b) — MD5→bcrypt, corregido.'],
  ['AUTH', 'Inyección SQL en login, control de acceso a funciones administrativas, cookie de sesión, fijación de sesión, enumeración de usuarios, cierre de sesión.', 'NC', 'VULN-01, VULN-02, VULN-06 — corregidos; ver fichas y reprueba.'],
  ['NETWORK', 'Transporte cliente-servidor (HTTP/TLS).', 'N/A', 'El proyecto entregado no incluye configuración de servidor web (vhost de Apache/Nginx) ni certificado para un despliegue de producción; no se encontraron endpoints propios codificados con http:// (solo recursos externos de terceros como fuentes e íconos). Queda fuera del alcance del código fuente evaluado; se recomienda forzar HTTPS y la cabecera Strict-Transport-Security en el servidor de producción.'],
  ['PLATFORM', 'Validación de archivos subidos al servidor (equivalente web a permisos/IPC); control de acceso a componentes administrativos.', 'NC', 'VULN-04 (subida de archivos) y VULN-02 (acceso a paneles) — corregidos. No aplican WebViews, enlaces profundos ni permisos del sistema operativo porque la aplicación entregada es una aplicación web PHP renderizada en servidor, sin empaquetado móvil (APK/IPA) en el proyecto evaluado.'],
  ['CODE', 'Validación de entradas, manejo de errores, modo de depuración.', 'NC', 'VULN-01 (inyección SQL) y VULN-05 (display_errors) — corregidos.'],
  ['RESILIENCE', 'Manipulación, ingeniería inversa, controles de entorno de ejecución.', 'N/A', 'No aplica: la aplicación no se distribuye como binario compilado (APK/IPA) sino como código PHP interpretado en el servidor; no existe un artefacto cliente que un atacante pueda descompilar o manipular localmente. El código fuente del servidor nunca llega al dispositivo del usuario, que es la premisa de los controles de resistencia de MASVS.'],
  ['PRIVACY', 'Minimización de datos, consentimiento, rastreadores, retención.', 'C', 'Los datos solicitados (nombre, correo, contraseña, comentarios) son los mínimos necesarios para la función de la app. No se detectaron scripts de rastreo/analítica de terceros en el código. Observación menor (no bloqueante): no existe un aviso de privacidad ni opción de eliminar la cuenta propia; se deja como recomendación para una iteración futura, fuera de las 6 correcciones de esta auditoría.'],
];

// ------------------------------------------------------------------
// Construcción del documento
// ------------------------------------------------------------------
const sections = [];

// ---- Portada ----
sections.push(
  new Paragraph({ spacing: { before: 600, after: 0 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'UNIVERSIDAD TECNOLÓGICA DE GUTIÉRREZ ZAMORA', bold: true, size: 24, color: COLOR.gris })] }),
  new Paragraph({ spacing: { before: 100, after: 600 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Desarrollo Móvil Integral', size: 22, color: COLOR.gris })] }),
  new Paragraph({ spacing: { before: 1200, after: 200 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'UNIDAD II — SEGURIDAD MASVS', bold: true, size: 32, color: COLOR.ribbon })] }),
  new Paragraph({ spacing: { before: 0, after: 1200 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Auditoría básica de seguridad con OWASP MASVS / MASTG\naplicación propia: TotoNinin', size: 26 })] }),
  new Paragraph({ spacing: { before: 1600, after: 80 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Referencia técnica: OWASP MASVS v2.x · OWASP MASTG (versión vigente a la fecha de la prueba)', italics: true, size: 20 }) ] }),
  new Paragraph({ spacing: { before: 800, after: 40 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Correo del alumno: albertohector91@gmail.com', size: 20 })] }),
  new Paragraph({ spacing: { before: 0, after: 40 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Nombre del alumno: _______________________________', size: 20 })] }),
  new Paragraph({ spacing: { before: 0, after: 40 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Grupo / matrícula: ______________________________', size: 20 })] }),
  new Paragraph({ spacing: { before: 0, after: 40 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Fecha del reporte: 29 de octubre de 2026', size: 20 })] }),
  new Paragraph({ children: [new PageBreak()] }),
);

// ---- Índice ----
sections.push(h1('Índice'));
const INDICE = [
  '1. Alcance y controles seleccionados',
  '2. Procedimiento de prueba',
  '3. Resultados y evidencias',
  '4. Hallazgos y nivel de riesgo',
  '5. Correcciones implementadas',
  '6. Repetición de pruebas y conclusiones',
  '7. Entrega y repositorio',
];
INDICE.forEach(t => sections.push(new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: t, size: 22 })] })));
sections.push(new Paragraph({ children: [new PageBreak()] }));

// ---- 1. Alcance y controles seleccionados ----
sections.push(h1('1. Alcance y controles seleccionados'));

sections.push(h2('1.1 Objeto de la auditoría'));
sections.push(p('Aplicación auditada: TotoNinin — sistema de gestión de eventos (registro de usuarios, calendario/categorías de eventos, comentarios y panel administrativo).'));
sections.push(table([
  headerRow(['Dato', 'Valor'], [2200, 7150]),
  new TableRow({ children: [txtCell('Tecnología', 2200, { bold: true }), txtCell('PHP 8 + MySQL/MariaDB, renderizado del lado del servidor (sin framework; mysqli procedural y orientado a objetos mezclados)', 7150)] }),
  new TableRow({ children: [txtCell('Plataforma', 2200, { bold: true }), txtCell('Aplicación web. No se incluyó en el ZIP entregado ningún empaquetado móvil nativo (APK/IPA) ni proyecto híbrido (Ionic/Cordova/Capacitor) para TotoNinin — ver aclaración de alcance en 1.3.', 7150)] }),
  new TableRow({ children: [txtCell('Versión / snapshot auditado', 2200, { bold: true }), txtCell('v1-original: snapshot del archivo .zip entregado el 29/10/2026 (sin historial de Git previo). v2-corregida: mismo código con las 6 correcciones de esta auditoría aplicadas. Ambas versiones se incluyen íntegras en el repositorio entregado (ver sección 7).', 7150)] }),
  new TableRow({ children: [txtCell('Entorno de prueba', 2200, { bold: true }), txtCell('Contenedor Linux aislado, PHP 8.3.6 (servidor embebido php -S). No fue posible instalar MariaDB/MySQL en el entorno de auditoría (sin acceso al repositorio de paquetes del sistema operativo), por lo que se usó una base de datos de prueba equivalente en SQLite con una capa de compatibilidad que traduce las mismas llamadas mysqli que usa la aplicación (pruebas/mysqli_shim.php), sin añadir ni quitar ninguna lógica de seguridad. Cada hallazgo se verificó además por revisión estática directa del código fuente PHP real.', 7150)] }),
  new TableRow({ children: [txtCell('Cuentas y datos de prueba', 2200, { bold: true }), txtCell('Usuarios ficticios con correos @totoninin.test y claves marcadas "Test/Prueba" (p. ej. admin@totoninin.test, user@totoninin.test). Ningún dato personal real se usó en ninguna prueba.', 7150)] }),
], [2200, 7150]));

sections.push(h2('1.2 Reglas de trabajo seguidas'));
[
  'Se auditó únicamente la aplicación propia del alumno (TotoNinin); no se atacó ningún servicio externo.',
  'Se usaron exclusivamente cuentas y datos de prueba, nunca información real.',
  'Las claves, hashes y cookies de sesión se ocultan en todas las capturas de evidencia de este reporte (se muestra su formato, no su valor).',
  'Cada cambio quedó registrado como commit independiente en el repositorio Git entregado (sección 7).',
  'Se conservó una copia íntegra de la versión original (v1-original) como respaldo antes de corregir, tal como exige la metodología.',
].forEach(t => sections.push(bullet(t)));

sections.push(h2('1.3 Aclaración de alcance: MASVS aplicado a una aplicación web'));
sections.push(p('OWASP MASVS fue diseñado para aplicaciones móviles nativas o híbridas distribuidas como binario (APK/IPA). La aplicación entregada para esta práctica, TotoNinin, es una aplicación web clásica renderizada en servidor (PHP/MySQL) y no incluye ningún artefacto móvil compilado. Siguiendo el propio material de la unidad — cuya plantilla de verificación (diapositivas 50 y 51) ya incorpora criterios agnósticos de plataforma como "HTTP o TLS mal validado" y "Secretos incluidos en Git" — se aplicaron los grupos de MASVS cuyo equivalente tiene sentido en una arquitectura cliente-servidor web: STORAGE, CRYPTO, AUTH, NETWORK, CODE y PLATFORM (en su parte de control de acceso a componentes administrativos y validación de archivos). Los controles intrínsecamente ligados a un binario móvil compilado y distribuido en el dispositivo del usuario — RESILIENCE (anti-tampering, ingeniería inversa de un ejecutable local) y la parte de PLATFORM referida a permisos del sistema operativo, WebViews y enlaces profundos — se marcaron No aplica, justificado en el checklist de la sección 6.4, porque el código fuente de TotoNinin nunca se ejecuta en el dispositivo del atacante: se ejecuta en el servidor.'));

sections.push(h2('1.4 Controles seleccionados'));
sections.push(table([
  headerRow(['Grupo MASVS', 'Resultado del alcance'], [2200, 7150]),
  ...[
    ['MASVS-STORAGE', 'Evaluado'], ['MASVS-CRYPTO', 'Evaluado'], ['MASVS-AUTH', 'Evaluado'],
    ['MASVS-NETWORK', 'No aplica (justificado) — ver checklist 6.4'],
    ['MASVS-PLATFORM', 'Evaluado parcialmente (control de acceso y validación de archivos); resto no aplica — ver checklist 6.4'],
    ['MASVS-CODE', 'Evaluado'],
    ['MASVS-RESILIENCE', 'No aplica (justificado) — ver checklist 6.4'],
    ['MASVS-PRIVACY', 'Evaluado (cumple, con una observación menor no bloqueante)'],
  ].map(([a, b]) => new TableRow({ children: [txtCell(a, 2200, { bold: true }), txtCell(b, 7150)] })),
], [2200, 7150]));

sections.push(new Paragraph({ children: [new PageBreak()] }));

// ---- 2. Procedimiento de prueba ----
sections.push(h1('2. Procedimiento de prueba'));
sections.push(p('Se siguieron las ocho fases de la metodología de la unidad: inventariar, inspección estática, prueba dinámica, registrar, priorizar, corregir, reprobar y entregar.'));

sections.push(h2('2.1 Inventario'));
[
  'Datos almacenados: tabla users (nombre, correo, hash de contraseña), events (título, descripción, fecha, foto, tipo), comments (texto libre asociado a un evento), event_type (catálogo de categorías).',
  'Funciones sensibles: inicio de sesión, registro público de usuarios, alta/edición/eliminación de usuarios desde el panel admin, alta/edición/eliminación de eventos y categorías, subida de fotografías de evento, publicación de comentarios, cierre de sesión.',
  'Permisos/roles: dos niveles implícitos en el código original — "usuario autenticado" y "administrador" (decidido comparando el correo contra un valor fijo), sin tabla de roles.',
  'Superficie expuesta sin autenticación: index.php, paginas/registro.php, paginas/login.php, paginas/informacion.php, paginas/preguntas.php.',
].forEach(t => sections.push(bullet(t)));

sections.push(h2('2.2 Inspección estática'));
sections.push(p('Revisión manual del código PHP completo (2,673 líneas en 37 archivos) buscando: concatenación de entrada de usuario en SQL, credenciales embebidas, algoritmo de hash de contraseñas, validación de archivos subidos, configuración de cookies de sesión, manejo de errores y presencia de .gitignore. Se usó comparación línea a línea (diff) entre v1-original y v2-corregida para verificar que cada corrección es mínima y no modifica comportamiento no relacionado con el hallazgo.'));

sections.push(h2('2.3 Prueba dinámica'));
sections.push(p('Se levantó la aplicación con el servidor embebido de PHP (php -S) contra la base de datos de prueba y se ejecutó un conjunto de pruebas HTTP automatizado y reproducible (pruebas/run_tests.py, incluido en el repositorio entregado), que para cada versión del código:'));
[
  'Reinicia la base de datos de prueba a un estado conocido antes de cada caso (aislamiento entre pruebas).',
  'Envía peticiones HTTP reales (con y sin sesión, con payloads maliciosos y con datos legítimos) usando un cliente propio con manejo de cookies.',
  'Registra la evidencia (código de estado, cabeceras relevantes, fragmentos de respuesta) enmascarando automáticamente cookies de sesión y hashes antes de guardarlos.',
  'Compara el resultado contra el criterio de corrección de cada hallazgo y lo marca SEGURO/CUMPLE o VULNERABLE/NO CUMPLE.',
].forEach(t => sections.push(bullet(t)));
sections.push(p('En total se ejecutaron 24 casos de prueba: 19 casos de seguridad (distribuidos en los 6 hallazgos) y 5 casos de regresión funcional (login legítimo, calendario, panel de administración, registro público y página de inicio), para verificar que las correcciones no rompieron ninguna función existente.'));

sections.push(h2('2.4 Registrar y priorizar'));
sections.push(p('Cada hallazgo se documentó con una ficha (ID, grupo MASVS, ubicación, pasos de reproducción, evidencia, probabilidad, impacto y nivel de riesgo), siguiendo la escala didáctica Riesgo = Impacto × Probabilidad (1–3 cada uno) de la unidad: 1–3 Bajo, 4–6 Medio, 7–8 Alto, 9 Crítico.'));

sections.push(new Paragraph({ children: [new PageBreak()] }));

// ---- 3. Resultados y evidencias ----
sections.push(h1('3. Resultados y evidencias'));
sections.push(p('Resumen comparativo de los 24 casos de prueba ejecutados contra ambas versiones del código:'));
sections.push(table([
  headerRow(['Versión', 'Casos seguros / cumplen', 'Casos vulnerables', 'Regresión funcional'], [2600, 2600, 2300, 1850]),
  new TableRow({ children: [txtCell('v1-original', 2600, { bold: true }), cell([new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${RES_V1.filter(r=>r.seguro).length} / ${RES_V1.length}`, color: COLOR.rojo, bold: true })] })], { width: 2600 }), txtCell(`${RES_V1.filter(r=>!r.seguro && !r.id.startsWith('R-')).length} de 19 casos de seguridad`, 2300), txtCell('5 / 5 (ya funcionaba)', 1850)] }),
  new TableRow({ children: [txtCell('v2-corregida', 2600, { bold: true }), cell([new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${RES_V2.filter(r=>r.seguro).length} / ${RES_V2.length}`, color: COLOR.verde, bold: true })] })], { width: 2600 }), txtCell('0 de 19 casos de seguridad', 2300), txtCell('5 / 5 (sin regresiones)', 1850)] }),
], [2600, 2600, 2300, 1850]));

sections.push(h2('3.1 Evidencia por hallazgo (código y comportamiento, antes/después)'));
sections.push(p('Las claves, hashes y cookies de sesión se muestran enmascarados (****) en toda la evidencia; solo se conserva su formato para poder verificar el control.', { italics: true, size: 18 }));

const EVID = [
  ['VULN-01 · Inyección SQL', 'v01_antes.png', 'v01_despues.png', 'v01_antes_terminal.png', 'v01_despues_terminal.png'],
  ['VULN-02 · Control de acceso roto', 'v02_antes.png', 'v02_despues.png', 'v02_antes_terminal.png', 'v02_despues_terminal.png'],
  ['VULN-03 · Hash de contraseñas débil', 'v03_antes.png', 'v03_despues.png', 'v03_antes_terminal.png', 'v03_despues_terminal.png'],
  ['VULN-04 · Subida de archivos sin validar', 'v04_antes.png', 'v04_despues.png', 'v04_antes_terminal.png', 'v04_despues_terminal.png'],
  ['VULN-05 · Secretos embebidos en el código', 'v05_antes.png', 'v05_despues.png', 'v05_antes_terminal.png', 'v05_despues_terminal.png'],
  ['VULN-06 · Gestión insegura de sesión', 'v06_antes.png', 'v06_despues.png', 'v06_antes_terminal.png', 'v06_despues_terminal.png'],
];
for (const [titulo, codA, codD, termA, termD] of EVID) {
  sections.push(h3(titulo));
  sections.push(p('Código — antes (izquierda) y después (derecha):', { bold: true, size: 20 }));
  sections.push(evidencePair('antes', codA, 'después', codD));
  sections.push(p('Comportamiento observado — antes (izquierda) y después (derecha):', { bold: true, size: 20, spacingBefore: 160 }));
  sections.push(evidencePair('antes', termA, 'después', termD));
}

sections.push(new Paragraph({ children: [new PageBreak()] }));

// ---- 4. Hallazgos y nivel de riesgo ----
sections.push(h1('4. Hallazgos y nivel de riesgo'));
sections.push(p('Ficha obligatoria por hallazgo. Riesgo = Impacto × Probabilidad (escala 1–3 cada uno; 1–3 Bajo, 4–6 Medio, 7–8 Alto, 9 Crítico — escala didáctica de la unidad, no una escala oficial de OWASP MASVS).'));

for (const f of HALLAZGOS) {
  sections.push(h2(`${f.id} — ${f.titulo}`));
  sections.push(table([
    new TableRow({ children: [txtCell('Grupo MASVS', 2200, { bold: true, shade: COLOR.grisClaro }), txtCell(f.grupo, 7150)] }),
    new TableRow({ children: [txtCell('Ubicación', 2200, { bold: true, shade: COLOR.grisClaro }), txtCell(f.ubicacion, 7150)] }),
    new TableRow({ children: [txtCell('Evidencia', 2200, { bold: true, shade: COLOR.grisClaro }), txtCell(`Casos ${f.evidenciaId} — ver sección 3.1 y anexo de resultados`, 7150)] }),
  ], [2200, 7150]));
  sections.push(p('Reproducción:', { bold: true, spacingBefore: 120 }));
  f.reproduccion.forEach((t, i) => sections.push(new Paragraph({ numbering: { reference: 'repro-numbering', level: 0 }, spacing: { after: 80 }, children: [new TextRun({ text: t })] })));
  sections.push(table([
    headerRow(['Probabilidad', 'Impacto', 'Riesgo'], [3117, 3116, 3117]),
    new TableRow({ children: [
      txtCell(`${f.probabilidad} (${['', 'baja', 'media', 'alta'][f.probabilidad]})`, 3117, { align: AlignmentType.CENTER }),
      txtCell(`${f.impacto} (${['', 'bajo', 'medio', 'alto'][f.impacto]})`, 3116, { align: AlignmentType.CENTER }),
      riskBadge(f.riesgo),
    ] }),
  ], [3117, 3116, 3117]));
  sections.push(p('Corrección aplicada:', { bold: true, spacingBefore: 120 }));
  sections.push(p(f.correccion, { spacingAfter: 300 }));
}

sections.push(new Paragraph({ children: [new PageBreak()] }));

// ---- 5. Correcciones implementadas ----
sections.push(h1('5. Correcciones implementadas'));
sections.push(p('Resumen de los archivos nuevos y modificados entre v1-original y v2-corregida. El detalle línea por línea de cada cambio está disponible como diff en el repositorio entregado (carpeta del commit "Correcciones VULN-01..06").'));

sections.push(h2('5.1 Archivos nuevos (infraestructura de seguridad reutilizable)'));
sections.push(table([
  headerRow(['Archivo', 'Propósito'], [3300, 6050]),
  ...[
    ['includes/config.php', 'Lee configuración (host/usuario/clave de BD, correo de administrador) desde variables de entorno o desde includes/config.local.php, nunca desde literales en el código.'],
    ['includes/config.local.example.php', 'Plantilla de ejemplo para que cada entorno (desarrollo/producción) cree su propio includes/config.local.php, excluido de Git.'],
    ['includes/db.php', 'Función db(): entrega una conexión mysqli ya configurada; ante un fallo registra el detalle en el log del servidor y muestra un mensaje genérico al usuario (VULN-05).'],
    ['includes/session.php', 'secure_session_start() (cookie con HttpOnly/SameSite, expiración por inactividad), login_user() (regenera el ID de sesión) y logout_user() (destruye la sesión y expira la cookie) — VULN-06.'],
    ['includes/auth.php', 'require_login(), require_admin() (VULN-02) y authenticate() con consulta preparada, password_verify() y migración automática de hashes MD5 heredados a bcrypt (VULN-01 / VULN-03).'],
    ['includes/upload.php', 'guardar_foto_evento(): valida tipo MIME real, tamaño y estructura de imagen, y genera un nombre de archivo aleatorio (VULN-04).'],
    ['fotos/.htaccess', 'Desactiva la ejecución de PHP dentro de la carpeta de imágenes subidas por usuarios, como defensa en profundidad adicional a VULN-04.'],
    ['.gitignore', 'Excluye includes/config.local.php, *.env y archivos temporales de prueba del control de versiones (VULN-05).'],
  ].map(([a, b]) => new TableRow({ children: [txtCell(a, 3300), txtCell(b, 6050)] })),
], [3300, 6050]));

sections.push(h2('5.2 Archivos modificados'));
sections.push(table([
  headerRow(['Archivo', 'Corrección aplicada'], [3300, 6050]),
  ...[
    ['scripts/login.php, paginas/login.php, paginas/login.js', 'VULN-01 (consulta preparada), VULN-06 (sesión segura, mensaje genérico, textContent en vez de innerHTML)'],
    ['scripts/conexion.php, bd_php/conexion.php, index.php, scripts/{load_events,obtener_eventos,evento_detalle,add_comment,eventos,registro}.php, paginas/registro.php, bd_php/usuarioBD.php', 'VULN-05 (credenciales fuera del código, errores sin detalle al usuario)'],
    ['scripts/{registro_usuario,editar_usuario,registro_categoria,editar_categoria,eliminar_usuario,eliminar_categoria,eliminar_confirmar_evento,lista_usuarios,lista_categoria,lista_eventos,buscar_usuario}.php, paginas/admin.php', 'VULN-02 (require_admin), VULN-01 (consultas preparadas, parámetros numéricos forzados a int)'],
    ['scripts/registro_evento.php, scripts/editar_evento.php', 'VULN-04 (validación real del archivo subido vía includes/upload.php)'],
    ['scripts/cerrar_sesion.php, includes/header.php, includes/nav.php', 'VULN-06 (logout_user(), rol es_admin calculado en el servidor)'],
  ].map(([a, b]) => new TableRow({ children: [txtCell(a, 3300), txtCell(b, 6050)] })),
], [3300, 6050]));

sections.push(new Paragraph({ children: [new PageBreak()] }));

// ---- 6. Repetición de pruebas y conclusiones ----
sections.push(h1('6. Repetición de pruebas y conclusiones'));

sections.push(h2('6.1 Reprueba'));
sections.push(p(`Se ejecutó el mismo conjunto de 24 pruebas automatizadas contra v2-corregida: ${RES_V2.filter(r=>r.seguro).length}/${RES_V2.length} casos resultaron SEGURO/CUMPLE, incluyendo los 5 casos de regresión funcional (login legítimo, calendario de eventos, panel de administración, registro público y página de inicio), lo que confirma que las correcciones eliminan los 6 hallazgos sin romper ninguna función existente de la aplicación.`));

sections.push(h2('6.2 Riesgos pendientes y recomendaciones adicionales'));
[
  'MASVS-NETWORK quedó fuera del alcance evaluable porque el proyecto no incluye la configuración del servidor web de producción; se recomienda forzar HTTPS y agregar la cabecera Strict-Transport-Security en ese servidor.',
  'No se implementó límite de intentos de inicio de sesión (rate limiting); se recomienda agregarlo para mitigar fuerza bruta residual, incluso con contraseñas ya en bcrypt.',
  'No se agregaron cabeceras de seguridad adicionales como Content-Security-Policy; se dejaron únicamente X-Content-Type-Options, X-Frame-Options y Referrer-Policy por ser cambios mínimos y no romper recursos externos ya usados por la app (fuentes e íconos de terceros).',
  'La observación menor de MASVS-PRIVACY (falta de aviso de privacidad y opción de autoeliminación de cuenta) se deja como mejora futura, fuera de las 6 correcciones obligatorias de esta auditoría.',
  'En un despliegue real, la base de datos debe usar un usuario de MySQL con privilegios mínimos y contraseña fuerte (nunca root sin clave); includes/config.local.example.php documenta ese cambio.',
].forEach(t => sections.push(bullet(t)));

sections.push(h2('6.3 Conclusiones'));
sections.push(p('La revisión identificó 6 fallas verificables (uno más del mínimo de 5 solicitado), repartidas en 3 de riesgo Crítico (inyección SQL, control de acceso roto y subida de archivos sin validar) y 3 de riesgo Medio (hash débil de contraseñas, secretos embebidos en el código y gestión insegura de sesión). Las 6 se corrigieron y se verificaron con pruebas dinámicas reproducibles antes y después del cambio, además de 5 pruebas de regresión que confirman que la funcionalidad original de la aplicación (inicio de sesión, calendario, panel de administración, registro público) se conserva intacta. Los controles MASVS-RESILIENCE y la parte de MASVS-PLATFORM ligada a permisos de sistema operativo se marcaron No aplica porque TotoNinin es una aplicación web sin empaquetado móvil compilado, justificación que se documenta en el checklist siguiente.'));

sections.push(h2('6.4 Checklist MASVS'));
sections.push(table([
  headerRow(['Área', 'Qué se revisó', 'Estado', 'Evidencia / justificación'], [1300, 2800, 950, 4300]),
  ...CHECKLIST.map(([area, que, estado, ev]) => new TableRow({ children: [
    txtCell(area, 1300, { bold: true }), txtCell(que, 2800),
    cell([new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: estado, bold: true, color: estado === 'C' ? COLOR.verde : estado === 'N/A' ? COLOR.gris : COLOR.rojo })] })], { width: 950 }),
    txtCell(ev, 4300),
  ] })),
], [1300, 2800, 950, 4300]));
sections.push(p('C = cumple · NC = no cumplía (corregido, reprobado y hoy cumple) · N/A = no aplica (justificado arriba)', { italics: true, size: 18, spacingBefore: 120 }));

sections.push(new Paragraph({ children: [new PageBreak()] }));

// ---- 7. Entrega y repositorio ----
sections.push(h1('7. Entrega y repositorio'));
sections.push(p('El repositorio entregado contiene:'));
[
  'v1-original/ — copia íntegra de la aplicación tal como fue recibida (snapshot del ZIP), conservada como respaldo antes de corregir.',
  'v2-corregida/ — la misma aplicación con las 6 correcciones aplicadas.',
  'pruebas/ — script de pruebas automatizado (run_tests.py), capa de compatibilidad de base de datos para el entorno de auditoría (mysqli_shim.php) y los resultados crudos de cada ejecución (resultados.txt / resultados.json) para ambas versiones.',
  'evidencias/ — las capturas de código y de comportamiento (antes/después) usadas en este reporte.',
  'reporte/ — este documento.',
].forEach(t => sections.push(bullet(t)));
sections.push(p('Historial de Git: el repositorio se inicializó con un commit "v1-original: snapshot de la aplicación entregada" y un segundo commit "Correcciones VULN-01..06 (reprueba 24/24)" que introduce exclusivamente los cambios descritos en la sección 5, de modo que el historial permite comparar antes/después con git diff.'));
sections.push(p('Pendiente de indicar por el alumno: URL del repositorio remoto (GitHub/GitLab) donde se debe subir — este documento y el código quedan listos para el push en cuanto se confirme el destino.', { italics: true }));

// Numbering config for "Reproducción" steps
const doc = new Document({
  numbering: {
    config: [{
      reference: 'repro-numbering',
      levels: [{ level: 0, format: 'decimal', text: '%1.', alignment: AlignmentType.START, style: { paragraph: { indent: { left: 420, hanging: 260 } } } }],
    }],
  },
  styles: {
    default: { document: { run: { font: 'Calibri', size: 21 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 30, bold: true, color: COLOR.ribbon }, paragraph: { spacing: { before: 360, after: 180 } } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 25, bold: true, color: '2E4057' }, paragraph: { spacing: { before: 260, after: 140 } } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 22, bold: true, italics: true, color: '2E4057' }, paragraph: { spacing: { before: 200, after: 100 } } },
    ],
  },
  sections: [{
    properties: {
      page: { size: { width: 12240, height: 15840 }, margin: { top: 1080, bottom: 1080, left: 1080, right: 1080 } },
    },
    headers: {
      default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'TotoNinin · Auditoría OWASP MASVS', size: 16, color: '9E9E9E' })] })] }),
    },
    footers: {
      default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Página ', size: 16, color: '9E9E9E' }), new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '9E9E9E' }), new TextRun({ text: ' de ', size: 16, color: '9E9E9E' }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: '9E9E9E' })] })] }),
    },
    children: sections,
  }],
});

Packer.toBuffer(doc).then(buf => {
  const out = path.join(__dirname, 'Auditoria_MASVS_TotoNinin.docx');
  fs.writeFileSync(out, buf);
  console.log('Escrito:', out);
});
