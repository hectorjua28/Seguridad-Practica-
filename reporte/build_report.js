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
    id: 'VULN-01', titulo: 'Inyección SQL',
    grupo: 'MASVS-CODE (principal) · MASVS-AUTH (secundario)',
    ubicacion: 'scripts/login.php (consulta del login); scripts/load_events.php y scripts/obtener_eventos.php (parámetro "mes"); scripts/lista_usuarios.php, lista_eventos.php y lista_categoria.php (parámetro "pagina"); scripts/registro_usuario.php, editar_usuario.php, registro_categoria.php y editar_categoria.php (correo y descripción)',
    repro: 'Para comprobarlo mandé un POST a scripts/login.php con x\' OR \'1\'=\'1 tanto en el correo como en la contraseña. El código pega lo que escribe el usuario directo dentro de la consulta SQL, así que la condición siempre sale verdadera y la app me dejó entrar sin conocer ninguna contraseña. Ya dentro con cualquier usuario, abrí scripts/load_events.php?mes=0 UNION SELECT ID_us,Name_us,password_us,... FROM users -- y esa página, que solo debería listar los eventos del mes, me mostró los hashes de contraseña de todos los usuarios.',
    evidenciaId: 'P-01a / P-01b', probabilidad: 3, impacto: 3, riesgo: 'Crítico',
    correccion: 'Para corregirlo cambié todas las consultas que armaban el SQL con lo que escribe el usuario por consultas preparadas (prepare y bind_param de mysqli). Además, los valores que deben ser números, como mes, pagina e id, ahora se convierten a entero antes de usarlos. El login quedó en una sola función, authenticate(), dentro de includes/auth.php.',
  },
  {
    id: 'VULN-02', titulo: 'Control de acceso roto en las funciones de administrador',
    grupo: 'MASVS-AUTH (principal) · MASVS-PLATFORM (secundario)',
    ubicacion: 'scripts/lista_usuarios.php, eliminar_usuario.php, editar_usuario.php, registro_usuario.php, lista_categoria.php, eliminar_categoria.php, registro_categoria.php, editar_categoria.php, lista_eventos.php, eliminar_confirmar_evento.php, registro_evento.php, editar_evento.php, paginas/admin.php',
    repro: 'Sin iniciar sesión pedí scripts/lista_usuarios.php y me mostró la lista completa de usuarios con nombre y correo. Con un POST a scripts/eliminar_usuario.php?id=3, también sin sesión, el usuario se borró de la base de datos. Con otro POST a scripts/editar_usuario.php?id=2 le cambié la contraseña a otro usuario y después pude entrar a su cuenta con la clave que puse yo. Por último, entré con un usuario normal (no administrador) y el panel de administración se abrió igual, porque ningún script revisa el rol.',
    evidenciaId: 'P-02a / P-02b / P-02c / P-02d', probabilidad: 3, impacto: 3, riesgo: 'Crítico',
    correccion: 'Creé includes/auth.php con las funciones require_login() y require_admin(). Los 14 scripts de administración ahora piden sesión iniciada y rol de administrador antes de leer o escribir cualquier dato. El rol (es_admin) se calcula en el servidor a partir de ADMIN_EMAIL.',
  },
  {
    id: 'VULN-03', titulo: 'Contraseñas guardadas con MD5',
    grupo: 'MASVS-CRYPTO (principal) · MASVS-STORAGE (secundario)',
    ubicacion: 'scripts/registro.php y scripts/registro_usuario.php (alta de usuarios desde el panel de administración)',
    repro: 'Registré un usuario desde scripts/registro_usuario.php y revisé la columna password_us en la base de datos. El valor era un hash MD5 de 32 caracteres hexadecimales y sin sal, que se puede descifrar en segundos con un diccionario si la base de datos llegara a filtrarse. El formulario público de registro (paginas/registro.php) ya usaba password_hash() con bcrypt desde el original, así que el problema estaba solo en el alta que hace el administrador y en la clase Registro, que quedó de una versión anterior.',
    evidenciaId: 'P-03a / P-03b', probabilidad: 2, impacto: 2, riesgo: 'Medio',
    correccion: 'Cambié md5() por password_hash($clave, PASSWORD_DEFAULT), que usa bcrypt, en todos los lugares donde se crea o se edita una contraseña. También agregué una migración: si una cuenta vieja todavía tiene hash MD5, en su primer login correcto se valida una vez y se guarda de nuevo con bcrypt.',
  },
  {
    id: 'VULN-04', titulo: 'Subida de archivos sin validar (ejecución de código en el servidor)',
    grupo: 'MASVS-CODE (principal) · MASVS-PLATFORM (secundario)',
    ubicacion: 'scripts/registro_evento.php y scripts/editar_evento.php (campo "foto")',
    repro: 'Con una cuenta normal, creada desde el registro público, creé un evento y en la foto subí un archivo shell.php que contiene <?php echo \'RCE_\'.(6*7); ?>. La aplicación solo revisa $foto[\'error\'] y mueve el archivo a la carpeta fotos/ con el mismo nombre y extensión que manda el navegador, sin comprobar qué contiene en realidad. Al abrir fotos/shell.php directamente, el servidor lo ejecutó como PHP y respondió RCE_42, o sea que cualquiera podría correr código en el servidor con los permisos del servidor web.',
    evidenciaId: 'P-04a / P-04b / P-04c', probabilidad: 3, impacto: 3, riesgo: 'Crítico',
    correccion: 'Agregué includes/upload.php con la función guardar_foto_evento(). Revisa que el archivo venga de una subida real (is_uploaded_file), limita el tamaño, comprueba el tipo real con fileinfo en lugar del que dice el navegador y lo compara con una lista de imágenes permitidas. Después confirma con getimagesize() que de verdad sea una imagen y la guarda con un nombre aleatorio y la extensión que corresponde a su tipo, nunca la que mandó el cliente. Como protección extra puse un fotos/.htaccess que apaga la ejecución de PHP en esa carpeta.',
  },
  {
    id: 'VULN-05', titulo: 'Credenciales escritas dentro del código',
    grupo: 'MASVS-STORAGE (principal) · MASVS-CODE (secundario)',
    ubicacion: 'scripts/conexion.php, bd_php/conexion.php, scripts/login.php, scripts/add_comment.php, scripts/evento_detalle.php, scripts/registro_evento.php, scripts/editar_evento.php, paginas/login.php, paginas/registro.php, index.php, scripts/load_events.php, scripts/obtener_eventos.php, scripts/eventos.php, scripts/registro.php, bd_php/usuarioBD.php',
    repro: 'Busqué en el código la cadena new mysqli("localhost","root","",...) y aparece repetida en 14 archivos, con el usuario root y la contraseña vacía escritos directo. Además bd_php/usuarioBD.php tenía error_reporting(E_ALL) e ini_set("display_errors",1), y mostraba el mensaje de error de MySQL al usuario con die("Error de conexión: " . $e->getMessage()), lo que deja ver rutas, nombres de tablas y la versión de MySQL a cualquiera que visite la página. El proyecto tampoco tenía archivo .gitignore, así que si algún día se creaba un archivo de configuración con credenciales reales, se habría subido al repositorio sin ningún control.',
    evidenciaId: 'P-05a / P-05b / P-05c', probabilidad: 2, impacto: 2, riesgo: 'Medio',
    correccion: 'Dejé la conexión en includes/db.php e includes/config.php, que leen el host, el usuario, la clave y la base de datos de variables de entorno o del archivo includes/config.local.php, que no se sube al repositorio. Los errores de conexión y de consulta ahora se guardan con error_log() y al usuario solo le sale un mensaje general. También agregué un .gitignore que excluye config.local.php, los archivos *.env y los registros temporales de las pruebas.',
  },
  {
    id: 'VULN-06', titulo: 'Manejo inseguro de la sesión',
    grupo: 'MASVS-AUTH (principal)',
    ubicacion: 'scripts/login.php, paginas/login.php, scripts/cerrar_sesion.php, includes/header.php, includes/nav.php',
    repro: 'Al iniciar sesión, la cabecera Set-Cookie del PHPSESSID no trae HttpOnly ni SameSite, y el identificador de sesión es el mismo que tenía el visitante antes de entrar porque no se llama a session_regenerate_id(). Eso permite que un atacante le dé a la víctima un identificador que él ya conoce, por ejemplo con un enlace, y lo siga usando cuando la víctima inicie sesión (fijación de sesión). Otro problema es que el login responde distinto cuando el correo no existe y cuando la contraseña es incorrecta, así que se pueden ir probando correos para saber cuáles están registrados. Además, scripts/cerrar_sesion.php llama a session_destroy() pero nunca borra la cookie del navegador, por lo que el identificador sigue viajando en cada petición. Por último, el rol de administrador se decide comparando el correo con un valor fijo dentro de includes/nav.php, repetido en varios archivos, en lugar de calcularlo una sola vez en el servidor al autenticar.',
    evidenciaId: 'P-06a / P-06b / P-06c / P-06d', probabilidad: 2, impacto: 2, riesgo: 'Medio',
    correccion: 'Creé includes/session.php. La cookie de sesión ahora lleva HttpOnly y SameSite=Lax, y Secure cuando se usa HTTPS; la sesión expira a los 30 minutos sin actividad; se llama a session_regenerate_id(true) en cada login; y logout_user() vacía $_SESSION, destruye la sesión en el servidor y expira la cookie en el navegador. El login ahora siempre responde "Credenciales incorrectas" sin decir cuál fue el motivo, y el rol es_admin se calcula una sola vez en el servidor al autenticar.',
  },
];

const CHECKLIST = [
  ['STORAGE', 'Credenciales escritas en el código, manejo de secretos, errores con demasiado detalle y secretos en Git.', 'NC', 'VULN-05 (P-05a/b/c). Corregido y comprobado en la reprueba.'],
  ['CRYPTO', 'Algoritmo de hash de las contraseñas y nombres de archivo o identificadores.', 'NC', 'VULN-03 (P-03a/b): de MD5 a bcrypt. Corregido.'],
  ['AUTH', 'Inyección SQL en el login, acceso a las funciones de administrador, cookie de sesión, fijación de sesión, saber qué correos existen y cierre de sesión.', 'NC', 'VULN-01, VULN-02 y VULN-06. Corregidos; ver sus fichas y la reprueba.'],
  ['NETWORK', 'Transporte entre cliente y servidor (HTTP/TLS).', 'N/A', 'El proyecto no incluye la configuración del servidor web (vhost de Apache o Nginx) ni un certificado de producción. Tampoco encontré en el código endpoints propios con http://, solo recursos externos como fuentes e íconos. Por eso queda fuera de lo que se puede evaluar con el código; en producción habría que forzar HTTPS y usar la cabecera Strict-Transport-Security.'],
  ['PLATFORM', 'Validación de archivos subidos (lo más parecido en web a permisos e IPC) y control de acceso a las partes de administración.', 'NC', 'VULN-04 (subida de archivos) y VULN-02 (acceso a los paneles). Corregidos. No aplican WebViews, enlaces profundos ni permisos del sistema operativo porque la app es web, se renderiza en el servidor y no tiene APK/IPA.'],
  ['CODE', 'Validación de entradas, manejo de errores y modo de depuración.', 'NC', 'VULN-01 (inyección SQL) y VULN-05 (display_errors). Corregidos.'],
  ['RESILIENCE', 'Manipulación, ingeniería inversa y controles del entorno de ejecución.', 'N/A', 'No aplica. La app no se distribuye como binario (APK/IPA) sino como código PHP que se interpreta en el servidor, así que no hay un archivo en el celular que alguien pueda descompilar o modificar. El código del servidor nunca llega al dispositivo del usuario, y esa es la idea de fondo de los controles de resistencia de MASVS.'],
  ['PRIVACY', 'Datos mínimos, consentimiento, rastreadores y retención.', 'C', 'Los datos que pide la app (nombre, correo, contraseña y comentarios) son los necesarios para funcionar y no encontré scripts de rastreo o analítica de terceros. Una observación menor que no bloquea: no hay aviso de privacidad ni opción para eliminar la cuenta propia; lo dejo como recomendación para después, fuera de las 6 correcciones de esta auditoría.'],
];

// ------------------------------------------------------------------
// Construcción del documento
// ------------------------------------------------------------------
const sections = [];

// ---- Portada (formato institucional) ----
function portadaLabel(text) {
  return new Paragraph({ spacing: { before: 500, after: 40 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text, bold: true, size: 22 })] });
}
function portadaValor(text) {
  return new Paragraph({ spacing: { before: 0, after: 0 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text, bold: true, size: 22 })] });
}
sections.push(
  new Paragraph({ spacing: { before: 400, after: 500 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'UNIVERSIDAD TECNOLÓGICA DE GUTIÉRREZ ZAMORA', bold: true, size: 26 })] }),
  portadaLabel('PROGRAMA EDUCATIVO:'),
  portadaValor('Ingeniería en Desarrollo y Gestión de Software'),
  portadaLabel('NOMBRE DE LA MATERIA:'),
  portadaValor('Desarrollo Móvil Integral'),
  portadaLabel('NOMBRE DE LA TAREA:'),
  portadaValor('Unidad II — Seguridad MASVS'),
  portadaValor('Auditoría básica de seguridad con OWASP MASVS / MASTG'),
  portadaValor('(aplicación propia: TotoNinin)'),
  portadaLabel('ELABORADO POR:'),
  portadaValor('Héctor Zahid Juárez Simbrón'),
  portadaLabel('DOCENTE:'),
  portadaValor('Lothar Yamir Hernández Gaona'),
  new Paragraph({ spacing: { before: 500, after: 40 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: '1010 - “AEI”', bold: true, size: 22 })] }),
  new Paragraph({ spacing: { before: 0, after: 40 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'SEPTIEMBRE – DICIEMBRE 2026', bold: true, size: 22 })] }),
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

sections.push(h2('1.1 Qué se auditó'));
sections.push(p('La aplicación que audité es TotoNinin, un sistema para gestionar eventos donde los usuarios se registran, ven un calendario con categorías de eventos y dejan comentarios, y un administrador maneja todo desde un panel. Está hecha en PHP 8 con MySQL/MariaDB y se renderiza del lado del servidor, sin framework, y mezcla mysqli procedural con mysqli orientado a objetos. Es una aplicación web: el ZIP del proyecto no trae ningún APK/IPA ni proyecto híbrido (Ionic, Cordova o Capacitor), por eso más abajo explico cómo apliqué MASVS en este caso.'));
sections.push(p('Trabajé con dos versiones. v1-original es el contenido del ZIP tal como lo recibí el 29/10/2026, sin historial de Git previo, y v2-corregida es el mismo código con las 6 correcciones de esta auditoría. Las dos están completas en el repositorio (ver «Entrega y repositorio»). Como referencia usé la versión 2 de OWASP MASVS, con sus grupos STORAGE, CRYPTO, AUTH, NETWORK, PLATFORM, CODE, RESILIENCE y PRIVACY, y la guía MASTG de apoyo para las pruebas.'));
sections.push(p('Las pruebas las hice en un contenedor Linux aislado con PHP 8.3.6 y el servidor integrado (php -S). No pude instalar MariaDB/MySQL porque el entorno no tenía acceso a los paquetes del sistema, así que usé una base de datos de prueba en SQLite con una capa que traduce las mismas llamadas mysqli que usa la app (pruebas/mysqli_shim.php). Esa capa no agrega ni quita ninguna lógica de seguridad, y además revisé cada hallazgo leyendo directamente el código PHP real.'));

sections.push(h2('1.2 Reglas de trabajo'));
sections.push(p('Solo audité mi propia aplicación y no ataqué ningún servicio externo. Todos los datos son de prueba: usuarios ficticios con correos @totoninin.test y claves marcadas como Test/Prueba (por ejemplo admin@totoninin.test y user@totoninin.test), sin ningún dato personal real. Las claves, los hashes y las cookies de sesión aparecen ocultos en todas las capturas y solo se deja su formato. Antes de corregir guardé una copia completa de la versión original (v1-original) como respaldo, y los cambios quedaron registrados en el historial de Git del repositorio.'));

sections.push(h2('1.3 Aclaración de alcance: MASVS aplicado a una aplicación web'));
sections.push(p('MASVS está pensado para aplicaciones móviles, nativas o híbridas, que se distribuyen como binario (APK/IPA). TotoNinin es una aplicación web en PHP que se ejecuta en el servidor y no trae ningún archivo móvil compilado. Aun así, las diapositivas 50 y 51 de la unidad incluyen criterios que no dependen de la plataforma, como "HTTP o TLS mal validado" y "Secretos incluidos en Git", así que apliqué los grupos de MASVS que tienen un equivalente en una aplicación cliente-servidor: STORAGE, CRYPTO, AUTH, NETWORK, CODE y PLATFORM (esta última solo en el control de acceso a las partes de administración y en la validación de archivos).'));
sections.push(p('Los controles que dependen de un binario instalado en el celular los marqué como No aplica. Son RESILIENCE (evitar que modifiquen o descompilen la app) y la parte de PLATFORM sobre permisos del sistema, WebViews y enlaces profundos. La razón es que el código de TotoNinin nunca llega al dispositivo del atacante porque corre en el servidor. La justificación completa está en el «Checklist MASVS».'));

sections.push(h2('1.4 Controles seleccionados'));
sections.push(p('Esta tabla muestra qué pasó con cada grupo de MASVS:'));
sections.push(table([
  headerRow(['Grupo MASVS', 'Resultado del alcance'], [2200, 7150]),
  ...[
    ['MASVS-STORAGE', 'Evaluado'], ['MASVS-CRYPTO', 'Evaluado'], ['MASVS-AUTH', 'Evaluado'],
    ['MASVS-NETWORK', 'No aplica (justificado), ver «Checklist MASVS»'],
    ['MASVS-PLATFORM', 'Evaluado en parte (control de acceso y validación de archivos); el resto no aplica, ver «Checklist MASVS»'],
    ['MASVS-CODE', 'Evaluado'],
    ['MASVS-RESILIENCE', 'No aplica (justificado), ver «Checklist MASVS»'],
    ['MASVS-PRIVACY', 'Evaluado (cumple, con una observación menor que no bloquea)'],
  ].map(([a, b]) => new TableRow({ children: [txtCell(a, 2200), txtCell(b, 7150)] })),
], [2200, 7150]));

// ---- 2. Procedimiento de prueba ----
sections.push(h1('2. Procedimiento de prueba'));
sections.push(p('Seguí las ocho fases de la metodología de la unidad: inventariar, inspección estática, prueba dinámica, registrar, priorizar, corregir, reprobar y entregar.'));

sections.push(h2('2.1 Inventario'));
sections.push(p('Primero anoté qué maneja la app. En la base de datos hay cuatro tablas: users (nombre, correo y hash de contraseña), events (título, descripción, fecha, foto y tipo), comments (texto libre ligado a un evento) y event_type (catálogo de categorías). Las funciones delicadas son iniciar sesión, el registro público, el alta, edición y eliminación de usuarios, eventos y categorías desde el panel de administración, la subida de fotos, los comentarios y cerrar sesión.'));
sections.push(p('En el código original hay dos niveles de permisos que no están escritos en ningún lado: usuario autenticado y administrador, y este último se decide comparando el correo con un valor fijo, sin tabla de roles. Sin iniciar sesión se puede entrar a index.php, paginas/registro.php, paginas/login.php, paginas/informacion.php y paginas/preguntas.php.'));

sections.push(h2('2.2 Inspección estática'));
sections.push(p('Revisé a mano todo el código PHP (2,673 líneas en 37 archivos) buscando entradas del usuario pegadas dentro de consultas SQL, credenciales escritas en el código, el algoritmo de hash de las contraseñas, la validación de los archivos subidos, la configuración de las cookies de sesión, el manejo de errores y si existía un .gitignore. Después comparé línea por línea (diff) v1-original contra v2-corregida para confirmar que cada corrección es pequeña y no cambia nada que no tenga que ver con el hallazgo.'));

sections.push(h2('2.3 Prueba dinámica'));
sections.push(p('Levanté la aplicación con el servidor integrado de PHP (php -S) sobre la base de datos de prueba y ejecuté un script de pruebas HTTP automático que se puede repetir (pruebas/run_tests.py, también en el repositorio). Para cada versión del código, el script deja la base de datos en un estado conocido antes de cada caso para que las pruebas no se afecten entre sí y manda peticiones HTTP reales, con y sin sesión, con datos maliciosos y con datos normales. Guarda lo que pasó (código de estado, cabeceras importantes y partes de la respuesta) ocultando automáticamente las cookies de sesión y los hashes. Al final compara el resultado con el criterio de cada hallazgo y marca el caso como SEGURO/CUMPLE o VULNERABLE/NO CUMPLE.'));
sections.push(p('En total fueron 24 casos: 19 de seguridad, repartidos en los 6 hallazgos, y 5 de regresión (login normal, calendario, panel de administración, registro público y página de inicio) para comprobar que las correcciones no rompieran nada que ya funcionaba.'));

sections.push(h2('2.4 Registrar y priorizar'));
sections.push(p('Cada hallazgo tiene su ficha con ID, grupo MASVS, ubicación, forma de reproducirlo, evidencia, probabilidad, impacto y nivel de riesgo. Para el nivel usé la escala de la unidad: riesgo = impacto × probabilidad, con valores del 1 al 3 en cada uno, donde 1–3 es Bajo, 4–6 Medio, 7–8 Alto y 9 Crítico.'));

// ---- 3. Resultados y evidencias ----
sections.push(h1('3. Resultados y evidencias'));
sections.push(p('Esta tabla compara los 24 casos de prueba ejecutados en las dos versiones del código:'));
sections.push(table([
  headerRow(['Versión', 'Casos seguros / cumplen', 'Casos vulnerables', 'Regresión funcional'], [2600, 2600, 2300, 1850]),
  new TableRow({ children: [txtCell('v1-original', 2600), cell([new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${RES_V1.filter(r=>r.seguro).length} / ${RES_V1.length}`, color: COLOR.rojo, bold: true })] })], { width: 2600 }), txtCell(`${RES_V1.filter(r=>!r.seguro && !r.id.startsWith('R-')).length} de 19 casos de seguridad`, 2300), txtCell('5 / 5 (ya funcionaba)', 1850)] }),
  new TableRow({ children: [txtCell('v2-corregida', 2600), cell([new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${RES_V2.filter(r=>r.seguro).length} / ${RES_V2.length}`, color: COLOR.verde, bold: true })] })], { width: 2600 }), txtCell('0 de 19 casos de seguridad', 2300), txtCell('5 / 5 (sin regresiones)', 1850)] }),
], [2600, 2600, 2300, 1850]));

sections.push(h2('3.1 Evidencia por hallazgo (código y comportamiento, antes y después)'));
sections.push(p('Las claves, los hashes y las cookies de sesión están ocultos con **** en todas las capturas; solo se deja su formato para poder comprobar el control.', { italics: true, size: 18 }));

const EVID = [
  ['VULN-01 · Inyección SQL', 'v01_antes.png', 'v01_despues.png', 'v01_antes_terminal.png', 'v01_despues_terminal.png'],
  ['VULN-02 · Control de acceso roto', 'v02_antes.png', 'v02_despues.png', 'v02_antes_terminal.png', 'v02_despues_terminal.png'],
  ['VULN-03 · Contraseñas guardadas con MD5', 'v03_antes.png', 'v03_despues.png', 'v03_antes_terminal.png', 'v03_despues_terminal.png'],
  ['VULN-04 · Subida de archivos sin validar', 'v04_antes.png', 'v04_despues.png', 'v04_antes_terminal.png', 'v04_despues_terminal.png'],
  ['VULN-05 · Credenciales escritas en el código', 'v05_antes.png', 'v05_despues.png', 'v05_antes_terminal.png', 'v05_despues_terminal.png'],
  ['VULN-06 · Manejo inseguro de la sesión', 'v06_antes.png', 'v06_despues.png', 'v06_antes_terminal.png', 'v06_despues_terminal.png'],
];
for (const [titulo, codA, codD, termA, termD] of EVID) {
  sections.push(h3(titulo));
  sections.push(p('Código antes (izquierda) y después (derecha):'));
  sections.push(evidencePair('antes', codA, 'después', codD));
  sections.push(p('Lo que pasó en las pruebas antes (izquierda) y después (derecha):', { spacingBefore: 160 }));
  sections.push(evidencePair('antes', termA, 'después', termD));
}

// ---- 4. Hallazgos y nivel de riesgo ----
sections.push(h1('4. Hallazgos y nivel de riesgo'));
sections.push(p('Cada hallazgo tiene su ficha. El riesgo es impacto × probabilidad (de 1 a 3 cada uno; 1–3 Bajo, 4–6 Medio, 7–8 Alto, 9 Crítico). Es la escala de la unidad, no una escala oficial de OWASP MASVS.'));

for (const f of HALLAZGOS) {
  sections.push(h2(`${f.id} — ${f.titulo}`));
  sections.push(table([
    new TableRow({ children: [txtCell('Grupo MASVS', 2200, { shade: COLOR.grisClaro }), txtCell(f.grupo, 7150)] }),
    new TableRow({ children: [txtCell('Ubicación', 2200, { shade: COLOR.grisClaro }), txtCell(f.ubicacion, 7150)] }),
    new TableRow({ children: [txtCell('Evidencia', 2200, { shade: COLOR.grisClaro }), txtCell(`Casos ${f.evidenciaId}; ver «Evidencia por hallazgo» y la carpeta pruebas/ del repositorio`, 7150)] }),
  ], [2200, 7150]));
  sections.push(p(f.repro, { spacingBefore: 160 }));
  sections.push(table([
    headerRow(['Probabilidad', 'Impacto', 'Riesgo'], [3117, 3116, 3117]),
    new TableRow({ children: [
      txtCell(`${f.probabilidad} (${['', 'baja', 'media', 'alta'][f.probabilidad]})`, 3117, { align: AlignmentType.CENTER }),
      txtCell(`${f.impacto} (${['', 'bajo', 'medio', 'alto'][f.impacto]})`, 3116, { align: AlignmentType.CENTER }),
      riskBadge(f.riesgo),
    ] }),
  ], [3117, 3116, 3117]));
  sections.push(p(f.correccion, { spacingBefore: 160, spacingAfter: 300 }));
}

// ---- 5. Correcciones implementadas ----
sections.push(h1('5. Correcciones implementadas'));
sections.push(p('Aquí está lo que cambió entre v1-original y v2-corregida. El detalle línea por línea está como diff en el repositorio, en el commit "Correcciones VULN-01..06 (OWASP MASVS) + evidencias + reporte técnico".'));

sections.push(h2('5.1 Archivos nuevos'));
sections.push(table([
  headerRow(['Archivo', 'Para qué sirve'], [3300, 6050]),
  ...[
    ['includes/config.php', 'Lee la configuración (host, usuario y clave de la base de datos, correo del administrador) de variables de entorno o de includes/config.local.php, en lugar de tenerla escrita en el código.'],
    ['includes/config.local.example.php', 'Ejemplo para que cada entorno (desarrollo o producción) cree su propio includes/config.local.php, que no se sube a Git.'],
    ['includes/db.php', 'Función db(), que entrega la conexión mysqli ya configurada. Si falla, guarda el detalle en el log del servidor y al usuario le muestra un mensaje general (VULN-05).'],
    ['includes/session.php', 'secure_session_start() (cookie con HttpOnly y SameSite, expiración por inactividad), login_user() (cambia el ID de sesión) y logout_user() (destruye la sesión y expira la cookie). Corrige VULN-06.'],
    ['includes/auth.php', 'require_login() y require_admin() (VULN-02) y authenticate(), con consulta preparada, password_verify() y migración de hashes MD5 viejos a bcrypt (VULN-01 y VULN-03).'],
    ['includes/upload.php', 'guardar_foto_evento(): revisa el tipo real, el tamaño y que sea una imagen válida, y genera un nombre de archivo aleatorio (VULN-04).'],
    ['fotos/.htaccess', 'Apaga la ejecución de PHP dentro de la carpeta de fotos subidas, como protección extra para VULN-04.'],
    ['.gitignore', 'Evita subir a Git includes/config.local.php, los archivos *.env y los archivos temporales de prueba (VULN-05).'],
  ].map(([a, b]) => new TableRow({ children: [txtCell(a, 3300), txtCell(b, 6050)] })),
], [3300, 6050]));

sections.push(h2('5.2 Archivos modificados'));
sections.push(table([
  headerRow(['Archivo', 'Qué se corrigió'], [3300, 6050]),
  ...[
    ['scripts/login.php, paginas/login.php, paginas/login.js', 'VULN-01 (consulta preparada) y VULN-06 (sesión segura, mensaje general y textContent en lugar de innerHTML)'],
    ['scripts/conexion.php, bd_php/conexion.php, index.php, scripts/{load_events,obtener_eventos,evento_detalle,add_comment,eventos,registro}.php, paginas/registro.php, bd_php/usuarioBD.php', 'VULN-05 (credenciales fuera del código, errores sin detalle para el usuario)'],
    ['scripts/{registro_usuario,editar_usuario,registro_categoria,editar_categoria,eliminar_usuario,eliminar_categoria,eliminar_confirmar_evento,lista_usuarios,lista_categoria,lista_eventos,buscar_usuario}.php, paginas/admin.php', 'VULN-02 (require_admin) y VULN-01 (consultas preparadas y parámetros numéricos convertidos a int)'],
    ['scripts/registro_evento.php, scripts/editar_evento.php', 'VULN-04 (validación real del archivo con includes/upload.php)'],
    ['scripts/cerrar_sesion.php, includes/header.php, includes/nav.php', 'VULN-06 (logout_user() y rol es_admin calculado en el servidor)'],
  ].map(([a, b]) => new TableRow({ children: [txtCell(a, 3300), txtCell(b, 6050)] })),
], [3300, 6050]));

// ---- 6. Repetición de pruebas y conclusiones ----
sections.push(h1('6. Repetición de pruebas y conclusiones'));

sections.push(h2('6.1 Reprueba'));
sections.push(p(`Corrí otra vez las mismas 24 pruebas automáticas contra v2-corregida y ${RES_V2.filter(r=>r.seguro).length} de ${RES_V2.length} casos salieron SEGURO/CUMPLE, incluidos los 5 de regresión (login normal, calendario de eventos, panel de administración, registro público y página de inicio). Con esto se ve que las correcciones quitan los 6 hallazgos sin romper ninguna función de la aplicación.`));

sections.push(h2('6.2 Pendientes y recomendaciones'));
sections.push(p('Quedaron cosas que no corregí. NETWORK no se pudo evaluar porque el proyecto no trae la configuración del servidor de producción; ahí habría que forzar HTTPS y agregar la cabecera Strict-Transport-Security. Tampoco puse un límite de intentos de login (rate limiting), que ayudaría contra la fuerza bruta aunque las contraseñas ya estén en bcrypt.'));
sections.push(p('De las cabeceras de seguridad solo agregué X-Content-Type-Options, X-Frame-Options y Referrer-Policy, y no puse Content-Security-Policy para no romper las fuentes e íconos externos que usa la app. La observación de PRIVACY (falta un aviso de privacidad y una opción para que el usuario borre su cuenta) la dejé como mejora futura. Por último, en un servidor real la base de datos debe usar un usuario de MySQL con permisos mínimos y una contraseña fuerte, nunca root sin clave; includes/config.local.example.php ya muestra ese cambio.'));

sections.push(h2('6.3 Conclusiones'));
sections.push(p('Encontré 6 fallas, una más que el mínimo de 5 que pedía la tarea: 3 de riesgo Crítico (inyección SQL, control de acceso roto y subida de archivos sin validar) y 3 de riesgo Medio (MD5 en las contraseñas, credenciales escritas en el código y manejo inseguro de la sesión). Las seis quedaron corregidas y las comprobé con pruebas que se pueden repetir, antes y después del cambio. Las 5 pruebas de regresión confirman que el inicio de sesión, el calendario, el panel de administración y el registro público siguen funcionando igual que antes.'));
sections.push(p('RESILIENCE y la parte de PLATFORM que depende de permisos del sistema los dejé como No aplica porque TotoNinin es una aplicación web sin empaquetado móvil. La justificación está en el checklist de abajo.'));

sections.push(h2('6.4 Checklist MASVS'));
sections.push(table([
  headerRow(['Área', 'Qué se revisó', 'Estado', 'Evidencia o justificación'], [1300, 2800, 950, 4300]),
  ...CHECKLIST.map(([area, que, estado, ev]) => new TableRow({ children: [
    txtCell(area, 1300), txtCell(que, 2800),
    cell([new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: estado, bold: true, color: estado === 'C' ? COLOR.verde : estado === 'N/A' ? COLOR.gris : COLOR.rojo })] })], { width: 950 }),
    txtCell(ev, 4300),
  ] })),
], [1300, 2800, 950, 4300]));
sections.push(p('C = cumple · NC = no cumplía (se corrigió, se volvió a probar y ahora cumple) · N/A = no aplica (justificado en la tabla)', { italics: true, size: 18, spacingBefore: 120 }));

// ---- 7. Entrega y repositorio ----
sections.push(h1('7. Entrega y repositorio'));
sections.push(p('Subí todo al repositorio de GitHub https://github.com/hectorjua28/Seguridad-Practica-. Tiene la carpeta v1-original/ con la aplicación tal como la recibí, v2-corregida/ con las 6 correcciones, pruebas/ con run_tests.py, la capa de compatibilidad mysqli_shim.php y los resultados de cada ejecución (resultados.txt y resultados.json) de las dos versiones, evidencias/ con las capturas de este reporte y reporte/ con este documento.'));
sections.push(p('El historial de Git empieza con un commit que guarda v1-original sin cambios y sigue con el commit de las correcciones VULN-01..06 y las evidencias, así que se puede comparar el antes y el después con git diff.'));


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
  const out = path.join(__dirname, 'contenido_base.docx');
  fs.writeFileSync(out, buf);
  console.log('Escrito:', out);
});
