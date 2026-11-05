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

const REPO_URL = process.env.REPO_URL || '';
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
function imgFull(name) {
  const m = MAN[name];
  const w = Math.min(m.w, 589), h = Math.round(w * m.h / m.w);
  return new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [new ImageRun({ type: 'png', data: fs.readFileSync(path.join(EV, name)), transformation: { width: w, height: h } })] });
}
const HALLAZGOS = [
  {
    id: 'VULN-01', titulo: 'Inyección SQL',
    grupo: 'MASVS-CODE y, en segundo plano, MASVS-AUTH',
    que: 'La inyección SQL pasa cuando el programa arma una consulta a la base de datos pegando directamente lo que escribió el usuario. Si alguien escribe código SQL en lugar de un correo, la base de datos lo ejecuta como si fuera parte de la consulta.',
    ubicacion: 'Está en el login (scripts/login.php), en el parámetro "mes" de scripts/load_events.php y scripts/obtener_eventos.php, en el parámetro "pagina" de lista_usuarios.php, lista_eventos.php y lista_categoria.php, y en los formularios de registro_usuario.php, editar_usuario.php, registro_categoria.php y editar_categoria.php (correo y descripción).',
    repro: 'Para comprobarlo mandé un POST a scripts/login.php con x\' OR \'1\'=\'1 tanto en el correo como en la contraseña. Como la condición siempre sale verdadera, la app me dejó entrar sin conocer ninguna contraseña. Ya dentro con cualquier usuario, abrí scripts/load_events.php?mes=0 UNION SELECT ID_us,Name_us,password_us,... FROM users -- y esa página, que solo debería listar los eventos del mes, me mostró los hashes de contraseña de todos los usuarios.',
    probabilidad: 3, impacto: 3, riesgo: 'Crítico',
    porque: 'Cualquiera puede entrar sin contraseña y leer los datos de todos los usuarios, y es muy fácil de hacer.',
    correccion: 'Cambié todas las consultas que armaban el SQL con lo que escribe el usuario por consultas preparadas (prepare y bind_param de mysqli). En una consulta preparada, la instrucción SQL y los datos viajan por separado, así que lo que escriba el usuario nunca se interpreta como código. Además, los valores que deben ser números, como mes, pagina e id, ahora se convierten a entero antes de usarlos. El login quedó en una sola función, authenticate(), dentro de includes/auth.php.',
  },
  {
    id: 'VULN-02', titulo: 'Control de acceso roto en las funciones de administrador',
    grupo: 'MASVS-AUTH y, en segundo plano, MASVS-PLATFORM',
    que: 'Control de acceso roto quiere decir que la aplicación no revisa si quien pide una acción tiene permiso para hacerla. Las pantallas y acciones de administrador estaban abiertas para cualquiera.',
    ubicacion: 'Afecta a scripts/lista_usuarios.php, eliminar_usuario.php, editar_usuario.php, registro_usuario.php, lista_categoria.php, eliminar_categoria.php, registro_categoria.php, editar_categoria.php, lista_eventos.php, eliminar_confirmar_evento.php, registro_evento.php, editar_evento.php y paginas/admin.php.',
    repro: 'Sin iniciar sesión pedí scripts/lista_usuarios.php y me mostró la lista completa de usuarios con nombre y correo. Con un POST a scripts/eliminar_usuario.php?id=3, también sin sesión, el usuario se borró de la base de datos. Con otro POST a scripts/editar_usuario.php?id=2 le cambié la contraseña a otro usuario y después pude entrar a su cuenta con la clave que puse yo. Por último, entré con un usuario normal (no administrador) y el panel de administración se abrió igual, porque ningún script revisa el rol.',
    probabilidad: 3, impacto: 3, riesgo: 'Crítico',
    porque: 'Cualquier persona, incluso sin cuenta, puede ver, borrar y modificar usuarios, y hasta quedarse con la cuenta de otro.',
    correccion: 'Creé includes/auth.php con las funciones require_login() y require_admin(). Los 14 scripts de administración ahora piden sesión iniciada y rol de administrador antes de leer o escribir cualquier dato. El rol (es_admin) se calcula en el servidor a partir de ADMIN_EMAIL, así que el usuario no puede cambiarlo desde el navegador.',
  },
  {
    id: 'VULN-03', titulo: 'Contraseñas guardadas con MD5',
    grupo: 'MASVS-CRYPTO y, en segundo plano, MASVS-STORAGE',
    que: 'Una base de datos no debe guardar la contraseña tal cual, sino un hash, que es el resultado de revolverla con una fórmula que no se puede deshacer. MD5 es una fórmula vieja y muy rápida, y como se usó sin sal (un dato aleatorio que se mezcla con la contraseña), es fácil adivinar contraseñas probando palabras de un diccionario.',
    ubicacion: 'Está en scripts/registro.php y scripts/registro_usuario.php (alta de usuarios desde el panel de administración).',
    repro: 'Registré un usuario desde scripts/registro_usuario.php y revisé la columna password_us en la base de datos. El valor era un hash MD5 de 32 caracteres hexadecimales y sin sal, que se puede descifrar en segundos si la base de datos llegara a filtrarse. El formulario público de registro (paginas/registro.php) ya usaba password_hash() con bcrypt desde el original, así que el problema estaba solo en el alta que hace el administrador y en la clase Registro, que quedó de una versión anterior.',
    probabilidad: 2, impacto: 2, riesgo: 'Medio',
    porque: 'Solo importa si alguien llega a ver la base de datos, y el registro público ya usaba bcrypt.',
    correccion: 'Cambié md5() por password_hash($clave, PASSWORD_DEFAULT), que usa bcrypt (un método más lento y con sal), en todos los lugares donde se crea o se edita una contraseña. También agregué una migración: si una cuenta vieja todavía tiene hash MD5, en su primer login correcto se valida una vez y se guarda de nuevo con bcrypt.',
  },
  {
    id: 'VULN-04', titulo: 'Subida de archivos sin validar',
    grupo: 'MASVS-CODE y, en segundo plano, MASVS-PLATFORM',
    que: 'Al crear un evento se puede subir una foto, pero la aplicación no comprueba que de verdad sea una imagen. Si alguien sube un archivo PHP, el servidor lo puede ejecutar como código, lo que se conoce como ejecución remota de código.',
    ubicacion: 'Está en scripts/registro_evento.php y scripts/editar_evento.php (campo "foto").',
    repro: 'Con una cuenta normal, creada desde el registro público, creé un evento y en la foto subí un archivo shell.php que contiene <?php echo \'RCE_\'.(6*7); ?>. La aplicación solo revisa $foto[\'error\'] y mueve el archivo a la carpeta fotos/ con el mismo nombre y extensión que manda el navegador, sin comprobar qué contiene en realidad. Al abrir fotos/shell.php directamente, el servidor lo ejecutó como PHP y respondió RCE_42, o sea que cualquiera podría correr código en el servidor con los permisos del servidor web.',
    probabilidad: 3, impacto: 3, riesgo: 'Crítico',
    porque: 'Con una cuenta normal se puede ejecutar código propio en el servidor.',
    correccion: 'Agregué includes/upload.php con la función guardar_foto_evento(). Revisa que el archivo venga de una subida real (is_uploaded_file), limita el tamaño, comprueba el tipo real con fileinfo en lugar del que dice el navegador y lo compara con una lista de imágenes permitidas. Después confirma con getimagesize() que de verdad sea una imagen y la guarda con un nombre aleatorio y la extensión que corresponde a su tipo, nunca la que mandó el cliente. Como protección extra puse un fotos/.htaccess que apaga la ejecución de PHP en esa carpeta.',
  },
  {
    id: 'VULN-05', titulo: 'Credenciales escritas dentro del código',
    grupo: 'MASVS-STORAGE y, en segundo plano, MASVS-CODE',
    que: 'Dejar usuarios y contraseñas escritos dentro del código es un problema porque cualquiera que vea el código (por ejemplo, si se sube a GitHub) ya tiene esos datos. Los mensajes de error con demasiado detalle también le dan pistas a un atacante.',
    ubicacion: 'Aparece en scripts/conexion.php, bd_php/conexion.php, scripts/login.php, scripts/add_comment.php, scripts/evento_detalle.php, scripts/registro_evento.php, scripts/editar_evento.php, paginas/login.php, paginas/registro.php, index.php, scripts/load_events.php, scripts/obtener_eventos.php, scripts/eventos.php, scripts/registro.php y bd_php/usuarioBD.php.',
    repro: 'Busqué en el código la cadena new mysqli("localhost","root","",...) y aparece repetida en 14 archivos, con el usuario root y la contraseña vacía escritos directo. Además bd_php/usuarioBD.php tenía error_reporting(E_ALL) e ini_set("display_errors",1), y mostraba el mensaje de error de MySQL al usuario con die("Error de conexión: " . $e->getMessage()), lo que deja ver rutas, nombres de tablas y la versión de MySQL a cualquiera que visite la página. El proyecto tampoco tenía archivo .gitignore, así que si algún día se creaba un archivo de configuración con credenciales reales, se habría subido al repositorio sin ningún control.',
    probabilidad: 2, impacto: 2, riesgo: 'Medio',
    porque: 'Con root y sin contraseña quien llegue a la base de datos tiene control total, pero para eso primero necesita acceso al código o al servidor.',
    correccion: 'Dejé la conexión en includes/db.php e includes/config.php, que leen el host, el usuario, la clave y la base de datos de variables de entorno o del archivo includes/config.local.php, que no se sube al repositorio. Los errores de conexión y de consulta ahora se guardan con error_log() y al usuario solo le sale un mensaje general. También agregué un .gitignore que excluye config.local.php, los archivos *.env y los registros temporales de las pruebas.',
  },
  {
    id: 'VULN-06', titulo: 'Manejo inseguro de la sesión',
    grupo: 'MASVS-AUTH',
    que: 'La sesión es lo que mantiene a un usuario dentro de la aplicación después de iniciar sesión, y se guarda en una cookie del navegador. Si no se cuida, esa cookie se puede robar o reutilizar.',
    ubicacion: 'Está en scripts/login.php, paginas/login.php, scripts/cerrar_sesion.php, includes/header.php e includes/nav.php.',
    repro: 'Al iniciar sesión, la cabecera Set-Cookie del PHPSESSID no trae HttpOnly ni SameSite, y el identificador de sesión es el mismo que tenía el visitante antes de entrar porque no se llama a session_regenerate_id(). Eso permite que un atacante le dé a la víctima un identificador que él ya conoce, por ejemplo con un enlace, y lo siga usando cuando la víctima inicie sesión (fijación de sesión). Otro problema es que el login responde distinto cuando el correo no existe y cuando la contraseña es incorrecta, así que se pueden ir probando correos para saber cuáles están registrados. Además, scripts/cerrar_sesion.php llama a session_destroy() pero nunca borra la cookie del navegador, por lo que el identificador sigue viajando en cada petición. Por último, el rol de administrador se decide comparando el correo con un valor fijo dentro de includes/nav.php, repetido en varios archivos, en lugar de calcularlo una sola vez en el servidor al autenticar.',
    probabilidad: 2, impacto: 2, riesgo: 'Medio',
    porque: 'Cada problema por separado necesita condiciones extra, como engañar a la víctima o tener acceso a su navegador.',
    correccion: 'Creé includes/session.php. La cookie de sesión ahora lleva HttpOnly (el código de la página no puede leerla) y SameSite=Lax (no se manda desde otros sitios), y Secure cuando se usa HTTPS; la sesión expira a los 30 minutos sin actividad; se llama a session_regenerate_id(true) en cada login; y logout_user() vacía $_SESSION, destruye la sesión en el servidor y expira la cookie en el navegador. El login ahora siempre responde "Credenciales incorrectas" sin decir cuál fue el motivo, y el rol es_admin se calcula una sola vez en el servidor al autenticar.',
  },
];

const CHECKLIST = [
  ['STORAGE', 'Credenciales escritas en el código, manejo de secretos, errores con demasiado detalle y secretos en Git.', 'NC', 'VULN-05. Corregido y comprobado al volver a probar.'],
  ['CRYPTO', 'Algoritmo de hash de las contraseñas y nombres de archivo o identificadores.', 'NC', 'VULN-03: de MD5 a bcrypt. Corregido.'],
  ['AUTH', 'Inyección SQL en el login, acceso a las funciones de administrador, cookie de sesión, fijación de sesión, saber qué correos existen y cierre de sesión.', 'NC', 'VULN-01, VULN-02 y VULN-06. Corregidos.'],
  ['NETWORK', 'Que la comunicación entre el navegador y el servidor esté protegida (HTTP/TLS).', 'N/A', 'El proyecto no incluye la configuración del servidor web ni un certificado de producción. Tampoco encontré en el código direcciones propias con http://, solo recursos externos como fuentes e íconos. Por eso no se puede evaluar con el código; en producción habría que forzar HTTPS.'],
  ['PLATFORM', 'Validación de archivos subidos y control de acceso a las partes de administración.', 'NC', 'VULN-04 y VULN-02. Corregidos. No aplican los permisos del sistema, los WebViews (páginas web dentro de una app) ni los enlaces profundos, porque la app es web, se arma en el servidor y no tiene APK/IPA.'],
  ['CODE', 'Validación de entradas, manejo de errores y modo de depuración.', 'NC', 'VULN-01 y VULN-05. Corregidos.'],
  ['RESILIENCE', 'Que sea difícil modificar la app o descompilarla.', 'N/A', 'No aplica. La app no se distribuye como archivo instalable (APK/IPA) sino como código PHP que corre en el servidor, así que no hay nada en el celular que alguien pueda descompilar o modificar.'],
  ['PRIVACY', 'Pedir solo los datos necesarios, consentimiento, rastreadores y cuánto tiempo se guardan los datos.', 'C', 'Los datos que pide la app (nombre, correo, contraseña y comentarios) son los necesarios para funcionar y no encontré scripts de rastreo de terceros. Una observación menor: no hay aviso de privacidad ni forma de que el usuario elimine su propia cuenta; queda como mejora para después.'],
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
// ---- 1. Alcance y controles ----
sections.push(h1('1. Alcance y controles'));

sections.push(h2('1.1 Alcance de la auditoría'));
sections.push(p('Esta auditoría revisó la seguridad de TotoNinin, una aplicación web hecha en PHP 8 y MySQL, sin framework, que sirve para gestionar eventos, usuarios, categorías y comentarios. Las pruebas se hicieron en un entorno local, con una base de datos de prueba y solo con datos ficticios: usuarios inventados con correos @totoninin.test y claves de prueba (por ejemplo admin@totoninin.test y user@totoninin.test). En todas las evidencias, las contraseñas, los hashes y las cookies de sesión aparecen ocultos.'));
sections.push(p('Se trabajó con dos versiones del código. v1-original es el proyecto tal como venía en el ZIP (lo recibí el 29/10/2026) y v2-corregida es el mismo proyecto con las correcciones aplicadas.'));

sections.push(h2('1.2 Referencia utilizada'));
sections.push(p('Usé OWASP MASVS (Mobile Application Security Verification Standard) en su versión 2, y la guía MASTG para saber cómo probar cada punto. MASVS agrupa los controles en ocho áreas: STORAGE (almacenamiento de datos), CRYPTO (criptografía), AUTH (autenticación y permisos), NETWORK (comunicación por la red), PLATFORM (relación con el sistema), CODE (calidad y seguridad del código), RESILIENCE (resistencia a la ingeniería inversa) y PRIVACY (privacidad).'));

sections.push(h2('1.3 Controles evaluados y controles que no aplican'));
sections.push(p('MASVS está pensado para apps móviles, y TotoNinin es una aplicación web que corre en un servidor: el proyecto no trae ningún APK ni IPA. Por eso evalué los controles que tienen un equivalente en una aplicación web: STORAGE, CRYPTO, AUTH, CODE y PLATFORM (en PLATFORM, el control de acceso a las funciones de administrador y la validación de los archivos que se suben). También revisé PRIVACY: la app pide solo los datos necesarios (nombre, correo, contraseña y comentarios) y no usa rastreadores de terceros. Su única observación es que no hay aviso de privacidad ni una forma de eliminar la propia cuenta, y la dejé como mejora para después.'));
sections.push(p('No aplica RESILIENCE, que protege contra la ingeniería inversa en el dispositivo (descompilar o modificar una app ya instalada), porque en TotoNinin el código se queda en el servidor y nunca llega al usuario. Tampoco aplican los puntos de PLATFORM que son propios del celular: permisos del sistema, WebViews (páginas web dentro de una app) y enlaces profundos. NETWORK no se evaluó a fondo porque el proyecto no incluye la configuración del servidor ni un certificado HTTPS, y en el entorno local se usó HTTP; para producción se recomienda activar HTTPS.'));

sections.push(h2('1.4 Escala de riesgo'));
sections.push(p('Para el nivel de riesgo le puse a cada hallazgo una probabilidad (qué tan fácil es aprovecharlo) y un impacto (qué tanto daño haría), de 1 a 3 cada uno, y los multipliqué. Un resultado de 1 a 3 es Bajo, de 4 a 6 Medio, de 7 a 8 Alto y 9 Crítico. Es la escala de la unidad, no una escala oficial de OWASP.'));

// ---- 2. Datos y autenticación ----
sections.push(h1('2. Datos y autenticación'));
sections.push(p('Aquí se revisó cómo maneja la aplicación las credenciales y las sesiones activas. Se encontraron cuatro problemas.'));
const NIV = ['', 'baja', 'media', 'alta'], NIV_I = ['', 'bajo', 'medio', 'alto'];
function hallazgo(f, sub) {
  sections.push(h2(`${sub} ${f.id} — ${f.titulo}`));
  sections.push(p(`${f.que} Pertenece a ${f.grupo}. ${f.ubicacion}`));
  sections.push(p(f.repro));
  sections.push(p(`Le puse probabilidad ${f.probabilidad} (${NIV[f.probabilidad]}) e impacto ${f.impacto} (${NIV_I[f.impacto]}), así que el riesgo es ${f.riesgo} (${f.probabilidad * f.impacto} de 9). ${f.porque}`));
}
const H = Object.fromEntries(HALLAZGOS.map(f => [f.id, f]));
hallazgo(H['VULN-01'], '2.1');
hallazgo(H['VULN-02'], '2.2');
hallazgo(H['VULN-03'], '2.3');
hallazgo(H['VULN-06'], '2.4');

// ---- 3. Red, permisos y configuración ----
sections.push(h1('3. Red, permisos y configuración'));
sections.push(p('Aquí se revisaron los archivos de configuración, lo que el proyecto guarda en sus archivos y los permisos de lo que se sube al servidor. Se encontraron dos problemas.'));
hallazgo(H['VULN-05'], '3.1');
hallazgo(H['VULN-04'], '3.2');

// ---- 4. Hallazgos y correcciones ----
sections.push(h1('4. Hallazgos y correcciones'));
sections.push(p('Los seis hallazgos se corrigieron en v2-corregida. Esta tabla los resume, y debajo se explica cada corrección con el código de antes y de después.'));
sections.push(table([
  headerRow(['Hallazgo', 'Área MASVS', 'Riesgo'], [4900, 2600, 1850]),
  ...HALLAZGOS.map(f => new TableRow({ children: [
    txtCell(`${f.id} — ${f.titulo}`, 4900), txtCell(f.grupo.split(' y,')[0].replace('MASVS-', ''), 2600), riskBadge(f.riesgo).constructor === TableCell ? cell([new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: f.riesgo, bold: true, color: f.riesgo === 'Crítico' ? COLOR.rojo : COLOR.naranja })] })], { width: 1850 }) : null,
  ] })),
], [4900, 2600, 1850]));
sections.push(p('Las claves, los hashes y las cookies de sesión están ocultos con **** en todas las capturas. En las capturas de código, las líneas resaltadas son las que importan para cada hallazgo, y el número de línea es el real del archivo.', { italics: true, size: 18, spacingBefore: 120 }));

const CODIGO = [
  ['VULN-01 · Inyección SQL', [
    ['En v1-original, scripts/login.php arma la consulta pegando directamente lo que escribe el usuario (líneas 21 a 23):', 'v01_antes.png'],
    ['En v2-corregida, el login llama a la función authenticate() en lugar de armar el SQL a mano:', 'v01_despues.png'],
    ['Y esa función usa una consulta preparada, donde los datos viajan separados de la instrucción SQL (includes/auth.php):', 'v01_despues_auth.png'],
  ]],
  ['VULN-02 · Control de acceso roto', [
    ['En v1-original, eliminar_usuario.php solo inicia la sesión, pero no revisa quién es el usuario ni qué rol tiene, así que cualquiera que llegue al archivo puede borrar (líneas 28 a 35):', 'v02_antes.png'],
    ['En v2-corregida, el archivo empieza llamando a require_admin():', 'v02_despues.png'],
    ['Esa función exige que haya sesión iniciada y que el usuario sea administrador (includes/auth.php):', 'v02_despues_auth.png'],
  ]],
  ['VULN-03 · Contraseñas guardadas con MD5', [
    ['En v1-original la contraseña se guarda con md5() (línea 17):', 'v03_antes.png'],
    ['En v2-corregida se usa password_hash() (línea 18) y los datos van en una consulta preparada:', 'v03_despues.png'],
    ['Además, al iniciar sesión, si la cuenta todavía tiene un hash MD5 viejo se acepta una sola vez y se cambia por bcrypt (includes/auth.php):', 'v03_despues_auth.png'],
  ]],
  ['VULN-04 · Subida de archivos sin validar', [
    ['En v1-original, registro_evento.php guarda la foto con el nombre que manda el navegador y sin revisar qué contiene (líneas 45 a 48):', 'v04_antes.png'],
    ['En v2-corregida, includes/upload.php revisa que sea una subida real, que no pese más de 2 MB, que su tipo real sea de imagen y que se pueda leer como imagen. Después la guarda con un nombre aleatorio:', 'v04_despues.png'],
    ['Además, la carpeta fotos/ tiene un archivo .htaccess que impide ejecutar PHP ahí:', 'v04_despues_htaccess.png'],
  ]],
  ['VULN-05 · Credenciales escritas en el código', [
    ['En v1-original, scripts/conexion.php trae el usuario root y la contraseña vacía escritos directo (líneas 3 a 6):', 'v05_antes.png'],
    ['En v2-corregida, conexion.php ya no tiene datos de acceso y le pide la conexión a db():', 'v05_despues.png'],
    ['Los datos se leen de variables de entorno o de config.local.php, que no se sube a Git (includes/config.php):', 'v05_despues_config.png'],
  ]],
  ['VULN-06 · Manejo inseguro de la sesión', [
    ['En v1-original, el login inicia la sesión sin cuidar la cookie ni cambiar el ID de sesión (líneas 27 a 29):', 'v06_antes.png'],
    ['En v2-corregida, includes/session.php configura la cookie con HttpOnly y SameSite (líneas 14 a 19), y login_user() cambia el ID de sesión (línea 41):', 'v06_despues.png'],
  ]],
];
for (const [titulo, items] of CODIGO) {
  const id = titulo.slice(0, 7);
  sections.push(h2(`${titulo.replace(' · ', ' — ')}`));
  sections.push(p(H[id].correccion));
  for (const [txt, nombre] of items) {
    sections.push(p(txt));
    sections.push(imgFull(nombre));
  }
}

// ---- 5. Verificación e informe ----
sections.push(h1('5. Verificación e informe'));

sections.push(h2('5.1 Procedimiento de prueba'));
sections.push(p(`Para cada hallazgo mandé a la aplicación las peticiones de ataque (por ejemplo, el texto x' OR '1'='1 en el login, un POST sin sesión a las páginas de administrador o un archivo shell.php como foto de un evento) y revisé la respuesta, primero en v1-original y después en v2-corregida. También comprobé que las funciones normales siguieran funcionando: iniciar sesión con un usuario válido, ver el calendario, usar el panel de administración con la cuenta de administrador, registrar un usuario y abrir la página de inicio.`));
sections.push(p(`En total fueron ${RES_V1.length} pruebas, 19 de seguridad y 5 de funcionamiento normal. En v1-original fallaron ${RES_V1.filter(r=>!r.seguro && !r.id.startsWith('R-')).length} de las 19 pruebas de seguridad, y en v2-corregida pasaron las ${RES_V2.length}.`));

sections.push(h2('5.2 Resultados de las pruebas'));
const RESULT = [
  ['VULN-01 · Inyección SQL', [['Resultado del ataque antes de corregir:', 'v01_antes_resultado.png'], ['Resultado del mismo ataque después de corregir:', 'v01_despues_resultado.png']]],
  ['VULN-02 · Control de acceso roto', [['Resultado de la prueba sin iniciar sesión, antes de corregir:', 'v02_antes_resultado.png'], ['Resultado de la misma prueba después de corregir:', 'v02_despues_resultado.png']]],
  ['VULN-03 · Contraseñas guardadas con MD5', [['Lo que se guardaba en la base de datos antes de corregir:', 'v03_antes_resultado.png'], ['Lo que se guarda después de corregir:', 'v03_despues_resultado.png']]],
  ['VULN-04 · Subida de archivos sin validar', [['Resultado de subir shell.php antes de corregir:', 'v04_antes_resultado.png'], ['Resultado de subir shell.php después de corregir:', 'v04_despues_resultado.png']]],
  ['VULN-05 · Credenciales escritas en el código', [['Resultado de buscar las credenciales en el código antes de corregir:', 'v05_antes_resultado.png'], ['Resultado de la misma búsqueda después de corregir:', 'v05_despues_resultado.png']]],
  ['VULN-06 · Manejo inseguro de la sesión', [['Resultado del inicio de sesión antes de corregir:', 'v06_antes_resultado.png'], ['Resultado del inicio de sesión después de corregir:', 'v06_despues_resultado.png']]],
];
for (const [titulo, items] of RESULT) {
  sections.push(h3(titulo));
  for (const [txt, nombre] of items) { sections.push(p(txt)); sections.push(imgFull(nombre)); }
}

sections.push(h2('5.3 Conclusiones de la repetición de pruebas'));
sections.push(p('Al repetir las pruebas con las correcciones aplicadas, el intento de inyección SQL en el login fue bloqueado y el intento de subir un archivo PHP disfrazado de imagen fue rechazado. El acceso a las páginas de administración sin sesión redirige al login, la cookie de sesión ya lleva HttpOnly y SameSite, y las contraseñas nuevas se guardan con bcrypt. Las funciones normales de la plataforma (ver el calendario, registrar usuarios, el panel de administración) siguen funcionando sin problemas.'));
sections.push(p('Con esto se concluye que TotoNinin corrigió los 6 hallazgos, incluidos los 3 de riesgo Crítico (inyección SQL, control de acceso roto y subida de archivos sin validar). Quedan pendientes algunas mejoras que no entraron en esta auditoría: activar HTTPS en el servidor de producción, poner un límite de intentos de inicio de sesión, agregar un aviso de privacidad con la opción de eliminar la cuenta, y usar en producción un usuario de MySQL con permisos mínimos y contraseña fuerte, nunca root sin clave.'));
sections.push(p(REPO_URL ? `Las dos versiones del código, v1-original y v2-corregida, están en el repositorio de GitHub ${REPO_URL}.` : 'Las dos versiones del código, v1-original y v2-corregida, están en el repositorio de GitHub de la entrega.'));

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
