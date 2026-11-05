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
// ---- 1. Alcance y controles seleccionados ----
sections.push(h1('1. Alcance y controles seleccionados'));

sections.push(h2('1.1 Qué se auditó'));
sections.push(p('TotoNinin es una aplicación para gestionar eventos. Los usuarios se registran, ven un calendario con categorías de eventos y pueden dejar comentarios, y un administrador maneja todo desde un panel. Está hecha en PHP 8 con MySQL y las páginas se arman en el servidor: el navegador solo recibe el resultado ya listo. No usa ningún framework, y mezcla mysqli procedural con mysqli orientado a objetos.'));
sections.push(p('No es una app móvil. El ZIP del proyecto no trae ningún APK ni IPA (los archivos con los que se instalan las apps en Android y en iPhone), solo el código web. Por eso, en la aclaración de alcance explico cómo usé MASVS en este caso.'));
sections.push(p('Como guía usé OWASP MASVS en su versión 2, que divide la seguridad de una app en ocho grupos: STORAGE (cómo se guardan los datos), CRYPTO (uso de cifrado y hashes), AUTH (inicio de sesión y permisos), NETWORK (comunicación por la red), PLATFORM (cómo se relaciona la app con el sistema), CODE (seguridad del código), RESILIENCE (qué tan difícil es modificar la app) y PRIVACY (manejo de datos personales). Para saber cómo probar cada punto me apoyé en la guía MASTG.'));
sections.push(p('Trabajé con dos versiones. v1-original es el código tal como venía en el ZIP (lo recibí el 29/10/2026) y v2-corregida es el mismo código con las 6 correcciones de esta auditoría. Las dos están completas en el repositorio. Las pruebas las corrí con el servidor integrado de PHP (php -S). No pude instalar MySQL, así que usé una base de datos SQLite que responde igual a las llamadas mysqli que hace la aplicación (pruebas/mysqli_shim.php). Eso no cambia nada de la seguridad de la app, y además revisé cada hallazgo leyendo el código PHP real.'));

sections.push(h2('1.2 Reglas de trabajo'));
sections.push(p('Solo probé mi propia aplicación y no ataqué ningún servicio externo. Todo se hizo con datos de prueba: usuarios inventados con correos @totoninin.test y claves de prueba (por ejemplo admin@totoninin.test y user@totoninin.test), sin información real de nadie. En las capturas, las claves, los hashes y las cookies de sesión están ocultos. Antes de corregir guardé una copia completa del código original (v1-original) para poder comparar.'));

sections.push(h2('1.3 Aclaración de alcance: MASVS aplicado a una aplicación web'));
sections.push(p('MASVS está hecho para apps móviles que se instalan en el celular, y TotoNinin corre en un servidor, así que no todos los puntos aplican. Usé los grupos que sí tienen un equivalente en una aplicación web: STORAGE, CRYPTO, AUTH, NETWORK, CODE y PLATFORM (en PLATFORM solo el control de acceso a las pantallas de administrador y la revisión de los archivos que se suben). El material de la unidad también incluye puntos que no dependen de la plataforma, como "HTTP o TLS mal validado" y "Secretos incluidos en Git".'));
sections.push(p('Dejé como No aplica lo que solo tiene sentido en una app instalada en el celular: RESILIENCE y, dentro de PLATFORM, los permisos del sistema, los WebViews y los enlaces profundos. La razón es que el código de TotoNinin nunca llega al dispositivo de quien ataca, porque se queda en el servidor. Cada caso está explicado en el checklist del final.'));

sections.push(h2('1.4 Controles seleccionados'));
sections.push(p('Evalué STORAGE, CRYPTO, AUTH y CODE completos, y PLATFORM solo en parte. PRIVACY también lo evalué y la app cumple, con una observación menor que no bloquea nada. NETWORK y RESILIENCE quedaron como No aplica, con su justificación en el checklist.'));

// ---- 2. Procedimiento de prueba ----
sections.push(h1('2. Procedimiento de prueba'));

sections.push(h2('2.1 Inventario'));
sections.push(p('Primero anoté qué maneja la app. En la base de datos hay cuatro tablas: users (nombre, correo y hash de contraseña), events (título, descripción, fecha, foto y tipo), comments (texto libre ligado a un evento) y event_type (catálogo de categorías). Las funciones delicadas son iniciar sesión, el registro público, el alta, edición y eliminación de usuarios, eventos y categorías desde el panel de administración, la subida de fotos, los comentarios y cerrar sesión.'));
sections.push(p('En el código original hay dos niveles de permisos que no están escritos en ningún lado: usuario con sesión y administrador, y este último se decide comparando el correo con un valor fijo, sin tabla de roles. Sin iniciar sesión se puede entrar a index.php, paginas/registro.php, paginas/login.php, paginas/informacion.php y paginas/preguntas.php.'));

sections.push(h2('2.2 Revisión del código'));
sections.push(p('Revisé a mano todo el código PHP (2,673 líneas en 37 archivos) buscando entradas del usuario pegadas dentro de consultas SQL, credenciales escritas en el código, el algoritmo con el que se guardan las contraseñas, la validación de los archivos subidos, la configuración de las cookies de sesión, el manejo de errores y si existía un .gitignore. Después de corregir comparé línea por línea v1-original contra v2-corregida para confirmar que cada cambio es pequeño y no toca nada que no tenga que ver con el hallazgo.'));

sections.push(h2('2.3 Pruebas con la aplicación funcionando'));
sections.push(p('Levanté la aplicación con el servidor integrado de PHP sobre la base de datos de prueba y escribí un script de Python que hace las pruebas solo y se puede repetir las veces que haga falta (pruebas/run_tests.py, también en el repositorio). Para cada versión del código, el script deja la base de datos en un estado conocido antes de cada caso para que las pruebas no se afecten entre sí y manda peticiones HTTP reales, con y sin sesión, con datos maliciosos y con datos normales. Guarda lo que pasó (código de estado, cabeceras importantes y partes de la respuesta) ocultando las cookies de sesión y los hashes. Al final compara el resultado con lo que se espera de cada hallazgo y marca el caso como SEGURO/CUMPLE o VULNERABLE/NO CUMPLE.'));
sections.push(p('En total fueron 24 casos: 19 de seguridad, repartidos en los 6 hallazgos, y 5 de regresión (login normal, calendario, panel de administración, registro público y página de inicio), que sirven para comprobar que las correcciones no rompieran nada que ya funcionaba.'));

sections.push(h2('2.4 Cómo calculé el riesgo'));
sections.push(p('A cada hallazgo le puse una probabilidad (qué tan fácil es que alguien lo aproveche) y un impacto (qué tanto daño haría), los dos del 1 al 3. El riesgo es la multiplicación de ambos: de 1 a 3 es Bajo, de 4 a 6 Medio, de 7 a 8 Alto y 9 Crítico. Es la escala que vimos en la unidad, no una escala oficial de OWASP.'));

// ---- 3. Resultados y evidencias ----
sections.push(h1('3. Resultados y evidencias'));
sections.push(p(`En v1-original solo ${RES_V1.filter(r=>r.seguro).length} de los ${RES_V1.length} casos salieron bien: los 5 de regresión, que comprueban que la app funciona normal, y ${RES_V1.filter(r=>r.seguro && !r.id.startsWith('R-')).length} de seguridad. Los otros ${RES_V1.filter(r=>!r.seguro && !r.id.startsWith('R-')).length} casos de seguridad fallaron. En v2-corregida pasaron los ${RES_V2.filter(r=>r.seguro).length}, así que los problemas se corrigieron sin romper nada de lo que ya funcionaba.`));

sections.push(h2('3.1 Evidencia por hallazgo'));
sections.push(p('Las claves, los hashes y las cookies de sesión están ocultos con **** en todas las capturas. En las capturas de código, las líneas resaltadas son las que importan para cada hallazgo, y el número de línea es el real del archivo.', { italics: true, size: 18 }));

const EVID = [
  ['VULN-01 · Inyección SQL', [
    ['En v1-original, scripts/login.php arma la consulta pegando directamente lo que escribe el usuario (líneas 21 a 23):', 'v01_antes.png'],
    ['En v2-corregida, el login llama a la función authenticate() en lugar de armar el SQL a mano:', 'v01_despues.png'],
    ['Y esa función usa una consulta preparada, donde los datos viajan separados de la instrucción SQL (includes/auth.php):', 'v01_despues_auth.png'],
    ['Resultado del ataque antes de corregir:', 'v01_antes_resultado.png'],
    ['Resultado del mismo ataque después de corregir:', 'v01_despues_resultado.png'],
  ]],
  ['VULN-02 · Control de acceso roto', [
    ['En v1-original, eliminar_usuario.php solo inicia la sesión, pero no revisa quién es el usuario ni qué rol tiene, así que cualquiera que llegue al archivo puede borrar (líneas 28 a 35):', 'v02_antes.png'],
    ['En v2-corregida, el archivo empieza llamando a require_admin():', 'v02_despues.png'],
    ['Esa función exige que haya sesión iniciada y que el usuario sea administrador (includes/auth.php):', 'v02_despues_auth.png'],
    ['Resultado de la prueba sin iniciar sesión, antes de corregir:', 'v02_antes_resultado.png'],
    ['Resultado de la misma prueba después de corregir:', 'v02_despues_resultado.png'],
  ]],
  ['VULN-03 · Contraseñas guardadas con MD5', [
    ['En v1-original la contraseña se guarda con md5() (línea 17):', 'v03_antes.png'],
    ['En v2-corregida se usa password_hash() (línea 18) y los datos van en una consulta preparada:', 'v03_despues.png'],
    ['Además, al iniciar sesión, si la cuenta todavía tiene un hash MD5 viejo se acepta una sola vez y se cambia por bcrypt (includes/auth.php):', 'v03_despues_auth.png'],
    ['Lo que se guardaba en la base de datos antes de corregir:', 'v03_antes_resultado.png'],
    ['Lo que se guarda después de corregir:', 'v03_despues_resultado.png'],
  ]],
  ['VULN-04 · Subida de archivos sin validar', [
    ['En v1-original, registro_evento.php guarda la foto con el nombre que manda el navegador y sin revisar qué contiene (líneas 45 a 48):', 'v04_antes.png'],
    ['En v2-corregida, includes/upload.php revisa que sea una subida real, que no pese más de 2 MB, que su tipo real sea de imagen y que se pueda leer como imagen. Después la guarda con un nombre aleatorio:', 'v04_despues.png'],
    ['Además, la carpeta fotos/ tiene un archivo .htaccess que impide ejecutar PHP ahí:', 'v04_despues_htaccess.png'],
    ['Resultado de subir shell.php antes de corregir:', 'v04_antes_resultado.png'],
    ['Resultado de subir shell.php después de corregir:', 'v04_despues_resultado.png'],
  ]],
  ['VULN-05 · Credenciales escritas en el código', [
    ['En v1-original, scripts/conexion.php trae el usuario root y la contraseña vacía escritos directo (líneas 3 a 6):', 'v05_antes.png'],
    ['En v2-corregida, conexion.php ya no tiene datos de acceso y le pide la conexión a db():', 'v05_despues.png'],
    ['Los datos se leen de variables de entorno o de config.local.php, que no se sube a Git (includes/config.php):', 'v05_despues_config.png'],
    ['Resultado de buscar las credenciales en el código antes de corregir:', 'v05_antes_resultado.png'],
    ['Resultado de la misma búsqueda después de corregir:', 'v05_despues_resultado.png'],
  ]],
  ['VULN-06 · Manejo inseguro de la sesión', [
    ['En v1-original, el login inicia la sesión sin cuidar la cookie ni cambiar el ID de sesión (líneas 27 a 29):', 'v06_antes.png'],
    ['En v2-corregida, includes/session.php configura la cookie con HttpOnly y SameSite (líneas 14 a 19), y login_user() cambia el ID de sesión (línea 41):', 'v06_despues.png'],
    ['Resultado del inicio de sesión antes de corregir:', 'v06_antes_resultado.png'],
    ['Resultado del inicio de sesión después de corregir:', 'v06_despues_resultado.png'],
  ]],
];
for (const [titulo, items] of EVID) {
  sections.push(h3(titulo));
  for (const [txt, nombre] of items) {
    sections.push(p(txt));
    sections.push(imgFull(nombre));
  }
}

// ---- 4. Hallazgos y nivel de riesgo ----
sections.push(h1('4. Hallazgos y nivel de riesgo'));

const NIV = ['', 'baja', 'media', 'alta'], NIV_I = ['', 'bajo', 'medio', 'alto'];
for (const f of HALLAZGOS) {
  sections.push(h2(`${f.id} — ${f.titulo}`));
  sections.push(p(`${f.que} Lo ubiqué en ${f.grupo}. ${f.ubicacion}`));
  sections.push(p(f.repro));
  sections.push(p(`Le puse probabilidad ${f.probabilidad} (${NIV[f.probabilidad]}) e impacto ${f.impacto} (${NIV_I[f.impacto]}), así que el riesgo es ${f.riesgo} (${f.probabilidad * f.impacto} de 9). ${f.porque}`));
  sections.push(p(f.correccion, { spacingAfter: 240 }));
}

// ---- 5. Correcciones implementadas ----
sections.push(h1('5. Correcciones implementadas'));

sections.push(h2('5.1 Archivos nuevos'));
sections.push(p('Para no repetir código en cada archivo, creé varias piezas reutilizables en la carpeta includes/. includes/config.php lee la configuración (host, usuario y clave de la base de datos, y el correo del administrador) de variables de entorno o de includes/config.local.php, en lugar de tenerla escrita en el código, e includes/config.local.example.php es un ejemplo para que cada entorno cree su propio archivo, porque el verdadero no se sube a Git. includes/db.php tiene la función db(), que devuelve la conexión ya configurada; si algo falla, guarda el detalle en el registro del servidor y al usuario le muestra un mensaje general (VULN-05).'));
sections.push(p('includes/session.php maneja la sesión de forma segura: secure_session_start() inicia la sesión con la cookie protegida y la expiración por inactividad, login_user() cambia el ID de sesión al entrar y logout_user() destruye la sesión y expira la cookie (VULN-06). includes/auth.php tiene require_login() y require_admin() (VULN-02) y authenticate(), que usa una consulta preparada, password_verify() y la migración de hashes MD5 viejos a bcrypt (VULN-01 y VULN-03). includes/upload.php tiene guardar_foto_evento(), que revisa el tipo real, el tamaño y que sea una imagen válida, y genera un nombre aleatorio (VULN-04).'));
sections.push(p('Fuera de includes/ agregué fotos/.htaccess, que apaga la ejecución de PHP dentro de la carpeta de fotos subidas como protección extra para VULN-04, y un .gitignore que evita subir a Git includes/config.local.php, los archivos *.env y los archivos temporales de prueba (VULN-05).'));

sections.push(h2('5.2 Archivos modificados'));
sections.push(p('En scripts/login.php, paginas/login.php y paginas/login.js corregí VULN-01 con la consulta preparada y VULN-06 con la sesión segura, el mensaje general de error y textContent en lugar de innerHTML. En scripts/conexion.php, bd_php/conexion.php, index.php, bd_php/usuarioBD.php, paginas/registro.php y los scripts load_events, obtener_eventos, evento_detalle, add_comment, eventos y registro saqué las credenciales del código y dejé de mostrarle al usuario los detalles de los errores (VULN-05).'));
sections.push(p('En los scripts de administración (registro_usuario, editar_usuario, registro_categoria, editar_categoria, eliminar_usuario, eliminar_categoria, eliminar_confirmar_evento, lista_usuarios, lista_categoria, lista_eventos y buscar_usuario, además de paginas/admin.php) agregué require_admin() para VULN-02 y cambié las consultas por consultas preparadas, con los parámetros numéricos convertidos a int, para VULN-01. scripts/registro_evento.php y scripts/editar_evento.php ahora validan la foto con includes/upload.php (VULN-04). Por último, scripts/cerrar_sesion.php, includes/header.php e includes/nav.php usan logout_user() y el rol es_admin calculado en el servidor (VULN-06).'));
sections.push(p('El detalle línea por línea se puede ver en el repositorio, en el commit "Correcciones VULN-01..06 (OWASP MASVS) + evidencias + reporte técnico".'));

// ---- 6. Repetición de pruebas y conclusiones ----
sections.push(h1('6. Repetición de pruebas y conclusiones'));

sections.push(h2('6.1 Pruebas después de corregir'));
sections.push(p(`Volví a correr las mismas 24 pruebas contra v2-corregida y ${RES_V2.filter(r=>r.seguro).length} de ${RES_V2.length} casos salieron SEGURO/CUMPLE, incluidos los 5 de regresión (login normal, calendario de eventos, panel de administración, registro público y página de inicio). Con esto se ve que las correcciones quitan los 6 hallazgos sin romper ninguna función de la aplicación.`));

sections.push(h2('6.2 Pendientes y recomendaciones'));
sections.push(p('Quedaron cosas que no corregí. NETWORK no se pudo evaluar porque el proyecto no trae la configuración del servidor de producción; ahí habría que forzar HTTPS para que la comunicación vaya cifrada. Tampoco puse un límite de intentos de login, que ayudaría contra quien prueba contraseñas una por una, aunque ya estén guardadas con bcrypt.'));
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
sections.push(p('El historial de Git empieza con un commit que guarda v1-original sin cambios y sigue con el commit de las correcciones VULN-01..06 y las evidencias, así que se puede comparar el antes y el después.'));

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
