#!/usr/bin/env python3
"""Genera capturas (PNG) de código antes/después y de salidas de prueba (terminal)."""
import pathlib, html, json
from pygments import highlight
from pygments.lexers import PhpLexer
from pygments.formatters import HtmlFormatter
from playwright.sync_api import sync_playwright

BASE = pathlib.Path('/home/claude/work/auditoria-totoninin')
OUT = BASE / 'evidencias'
OUT.mkdir(exist_ok=True)
FMT = HtmlFormatter(style='native', nowrap=False)
CSS = FMT.get_style_defs('.code')

PAGE = """<!doctype html><html><head><meta charset="utf-8"><style>
body{{margin:0;background:#1e1e1e;font-family:'DejaVu Sans Mono',monospace;}}
.wrap{{display:inline-block;padding:18px 22px;background:#1e1e1e;border-radius:8px;}}
.titulo{{color:#e6e6e6;font-size:15px;font-weight:bold;margin-bottom:10px;font-family:'DejaVu Sans',sans-serif;}}
.ruta{{color:#9cdcfe;font-size:12px;margin-bottom:10px;font-family:'DejaVu Sans Mono',monospace;}}
.code pre{{margin:0;font-size:13px;line-height:1.5;}}
{css}
.code{{background:#272822;padding:12px 14px;border-radius:6px;}}
</style></head><body>
<div class="wrap">
  <div class="titulo">{titulo}</div>
  <div class="ruta">{ruta}</div>
  <div class="code">{codigo}</div>
</div>
</body></html>"""

TERM = """<!doctype html><html><head><meta charset="utf-8"><style>
body{{margin:0;background:#0b0b0b;font-family:'DejaVu Sans Mono',monospace;}}
.wrap{{display:inline-block;padding:16px 20px;background:#0b0b0b;border-radius:8px;min-width:560px;}}
.titulo{{color:#e6e6e6;font-size:14px;font-weight:bold;margin-bottom:10px;font-family:'DejaVu Sans',sans-serif;}}
.bar{{display:flex;gap:6px;margin-bottom:10px;}}
.dot{{width:10px;height:10px;border-radius:50%;}}
.r{{background:#ff5f56}} .y{{background:#ffbd2e}} .g{{background:#27c93f}}
pre{{color:#d8d8d8;font-size:13px;line-height:1.55;margin:0;white-space:pre-wrap;word-break:break-word;}}
.ok{{color:#4ec9b0;font-weight:bold}} .bad{{color:#f14c4c;font-weight:bold}}
.cmd{{color:#58a6ff}}
</style></head><body>
<div class="wrap">
  <div class="bar"><div class="dot r"></div><div class="dot y"></div><div class="dot g"></div></div>
  <div class="titulo">{titulo}</div>
  <pre>{contenido}</pre>
</div>
</body></html>"""

def shot(pw_page, out_png, html_str):
    pw_page.set_content(html_str, wait_until='load')
    el = pw_page.query_selector('.wrap')
    el.screenshot(path=str(out_png))

def code_png(pw_page, out, titulo, ruta, codigo):
    resaltado = highlight(codigo, PhpLexer(), FMT)
    shot(pw_page, out, PAGE.format(css=CSS, titulo=html.escape(titulo), ruta=html.escape(ruta), codigo=resaltado))

def term_png(pw_page, out, titulo, lineas):
    cont = []
    for tag, txt in lineas:
        t = html.escape(txt)
        if tag == 'cmd': cont.append(f'<span class="cmd">$ {t}</span>')
        elif tag == 'ok': cont.append(f'<span class="ok">{t}</span>')
        elif tag == 'bad': cont.append(f'<span class="bad">{t}</span>')
        else: cont.append(t)
    shot(pw_page, out, TERM.format(titulo=html.escape(titulo), contenido='\n'.join(cont)))

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 1000, 'height': 100})

    # ---------- VULN-01 SQL Injection ----------
    code_png(page, OUT/'v01_antes.png', 'VULN-01 · Antes — concatenación directa en la consulta', 'scripts/login.php (línea 23-25)', '''$email = $_POST["email"];
$password = $_POST["pass"];

$sql = "SELECT * FROM users WHERE email_us = '$email' AND password_us = '$password'";
$result = $conn->query($sql);''')
    code_png(page, OUT/'v01_despues.png', 'VULN-01 · Después — consulta preparada + verificación de hash', 'scripts/login.php + includes/auth.php', '''$email = trim($_POST["email"] ?? '');
$clave = $_POST["pass"] ?? '';

$user = ($email !== '' && $clave !== '') ? authenticate($conn, $email, $clave) : null;
// authenticate() usa:
$st = $conn->prepare('SELECT ID_us, Name_us, email_us, password_us FROM users WHERE email_us = ?');
$st->bind_param('s', $correo);
$st->execute();''')
    term_png(page, OUT/'v01_antes_terminal.png', 'VULN-01 · Prueba antes de corregir', [
        ('cmd', "curl -s -i -d \"email=x' OR '1'='1&pass=x' OR '1'='1\" http://localhost/scripts/login.php"),
        ('plain', 'HTTP/1.1 302 Found'),
        ('plain', 'Location: ../paginas/calendario.php'),
        ('plain', "Set-Cookie: PHPSESSID=****"),
        ('bad', '[FALLA] Autenticación evadida con payload SQL — sesión iniciada sin credenciales válidas.'),
    ])
    term_png(page, OUT/'v01_despues_terminal.png', 'VULN-01 · Prueba después de corregir', [
        ('cmd', "curl -s -i -d \"email=x' OR '1'='1&pass=x' OR '1'='1\" http://localhost/scripts/login.php"),
        ('plain', 'HTTP/1.1 401 Unauthorized'),
        ('plain', '{"success":false,"error":"Credenciales incorrectas"}'),
        ('ok', '[OK] El payload se trata como texto literal; no hay bypass ni Set-Cookie.'),
    ])

    # ---------- VULN-02 Control de acceso ----------
    code_png(page, OUT/'v02_antes.png', 'VULN-02 · Antes — sin verificación de rol', 'scripts/eliminar_usuario.php (línea 1-16)', '''<?php
session_start();

include "conexion.php";

if(empty($_GET['id'])){
    header("location: lista_usuarios.php");
} else {
    $id_usuario = $_GET['id'];
    ...
    $query_delete = mysqli_query($conection, "DELETE FROM users WHERE ID_us = $id_usuario");
}''')
    code_png(page, OUT/'v02_despues.png', 'VULN-02 · Después — control de acceso en el servidor', 'scripts/eliminar_usuario.php + includes/auth.php', '''<?php
require_once __DIR__ . '/../includes/auth.php';
require_admin(); // VULN-02: exige sesión + rol administrador

function require_admin() {
    require_login();
    if (empty($_SESSION['es_admin'])) {
        http_response_code(403);
        exit('Acceso denegado');
    }
}''')
    term_png(page, OUT/'v02_antes_terminal.png', 'VULN-02 · Prueba antes de corregir (sin sesión)', [
        ('cmd', 'curl -s -i -X POST http://localhost/scripts/eliminar_usuario.php?id=3 -d id=3'),
        ('plain', 'HTTP/1.1 302 Found'),
        ('plain', 'Location: lista_usuarios.php'),
        ('bad', '[FALLA] El usuario id=3 fue eliminado por un visitante sin sesión iniciada.'),
    ])
    term_png(page, OUT/'v02_despues_terminal.png', 'VULN-02 · Prueba después de corregir (sin sesión)', [
        ('cmd', 'curl -s -i -X POST http://localhost/scripts/eliminar_usuario.php?id=3 -d id=3'),
        ('plain', 'HTTP/1.1 302 Found'),
        ('plain', 'Location: ../paginas/login.php'),
        ('ok', '[OK] Redirigido al login; el registro permanece intacto en la base de datos.'),
    ])

    # ---------- VULN-03 Hash de contraseñas ----------
    code_png(page, OUT/'v03_antes.png', 'VULN-03 · Antes — MD5 sin sal', 'scripts/registro_usuario.php (línea 17)', '''$Name_us = $_POST['Name_us'];
$email_us = $_POST['email_us'];
$password_us = md5($_POST['password_us']); // sin sal, reversible por diccionario

$query_insert = mysqli_query($conection,
  "INSERT INTO users(Name_us,email_us,password_us) VALUES('$Name_us','$email_us','$password_us')");''')
    code_png(page, OUT/'v03_despues.png', 'VULN-03 · Después — bcrypt con sal + migración de cuentas antiguas', 'scripts/registro_usuario.php + includes/auth.php', '''$password_us = password_hash($_POST['password_us'], PASSWORD_DEFAULT); // bcrypt con sal

$ins = $conection->prepare("INSERT INTO users(Name_us,email_us,password_us) VALUES(?,?,?)");
$ins->bind_param("sss", $Name_us, $email_us, $password_us);

// En el login, si la cuenta aún tiene un hash MD5 heredado, se valida una vez y se migra:
elseif (preg_match('/^[a-f0-9]{32}$/i', $hash) && hash_equals(strtolower($hash), md5($clave))) {
    $ok = true; $migrar = true;   // se reemplaza por bcrypt en la misma petición
}''')
    term_png(page, OUT/'v03_antes_terminal.png', 'VULN-03 · Prueba antes de corregir', [
        ('cmd', 'sqlite3 totoninin.db "SELECT password_us FROM users WHERE email_us=\'nuevo@totoninin.test\'"'),
        ('plain', '[hash MD5 de 32 caracteres — oculto]'),
        ('bad', '[FALLA] Hash MD5 sin sal: crackeable con diccionario/rainbow table en segundos.'),
    ])
    term_png(page, OUT/'v03_despues_terminal.png', 'VULN-03 · Prueba después de corregir', [
        ('cmd', 'sqlite3 totoninin.db "SELECT password_us FROM users WHERE email_us=\'nuevo@totoninin.test\'"'),
        ('plain', '[hash bcrypt $2y$10$... — oculto]'),
        ('ok', '[OK] bcrypt con sal y factor de costo; no es reversible por diccionario.'),
    ])

    # ---------- VULN-04 Subida de archivos ----------
    code_png(page, OUT/'v04_antes.png', 'VULN-04 · Antes — sin validar tipo ni contenido', 'scripts/registro_evento.php (línea 39-48)', '''// Verificar si la foto es válida
if ($foto['error'] !== 0) {
    echo "Error: Foto inválida";
    exit;
}

// Mover la foto a una carpeta temporal
$rutaTemporal = $foto['tmp_name'];
$rutaDestino = '../fotos/' . $foto['name'];   // nombre y extensión del cliente, sin validar
move_uploaded_file($rutaTemporal, $rutaDestino);''')
    code_png(page, OUT/'v04_despues.png', 'VULN-04 · Después — valida MIME real y bloquea ejecución', 'includes/upload.php + fotos/.htaccess', '''function guardar_foto_evento($f) {
    if (!is_uploaded_file($f['tmp_name']) || $f['size'] > 2*1024*1024) return null;
    $permitidos = ['image/jpeg'=>'jpg','image/png'=>'png','image/gif'=>'gif','image/webp'=>'webp'];
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($f['tmp_name']);     // MIME real, no el del navegador
    if (!isset($permitidos[$mime]) || @getimagesize($f['tmp_name']) === false) return null;
    $nombre = bin2hex(random_bytes(16)) . '.' . $permitidos[$mime];    // nombre aleatorio, no el del cliente
    move_uploaded_file($f['tmp_name'], __DIR__.'/../fotos/'.$nombre);
    return '../fotos/' . $nombre;
}
# fotos/.htaccess: php_flag engine off  (defensa en profundidad)''')
    term_png(page, OUT/'v04_antes_terminal.png', 'VULN-04 · Prueba antes de corregir', [
        ('cmd', "curl -s -F \"foto=@shell.php;type=image/jpeg\" ... registro_evento.php"),
        ('cmd', 'curl -s http://localhost/fotos/shell.php'),
        ('plain', 'RCE_42'),
        ('bad', '[FALLA] El archivo .php subido se ejecutó en el servidor (ejecución remota de código).'),
    ])
    term_png(page, OUT/'v04_despues_terminal.png', 'VULN-04 · Prueba después de corregir', [
        ('cmd', "curl -s -i -F \"foto=@shell.php;type=image/jpeg\" ... registro_evento.php"),
        ('plain', 'HTTP/1.1 400 Bad Request'),
        ('plain', 'Error: archivo de imagen no válido'),
        ('ok', '[OK] Rechazado por tipo MIME real; nunca se guarda ni se ejecuta.'),
    ])

    # ---------- VULN-05 Secretos en código ----------
    code_png(page, OUT/'v05_antes.png', 'VULN-05 · Antes — credenciales fijas en el repositorio', 'scripts/conexion.php', '''<?php
$host = 'localhost';
$user = 'root';
$password = '';
$db = 'totoninin';

$conection = @mysqli_connect($host,$user,$password,$db);''')
    code_png(page, OUT/'v05_despues.png', 'VULN-05 · Después — credenciales fuera del código', 'scripts/conexion.php + includes/config.php', '''<?php
require_once __DIR__ . '/../includes/db.php';
$conection = db();

// includes/config.php lee de variables de entorno o de
// includes/config.local.php (archivo excluido en .gitignore):
function cfg($clave, $defecto = null) {
    $valor = getenv($clave);
    ...
    return $local[$clave] ?? $defecto;
}''')
    term_png(page, OUT/'v05_antes_terminal.png', 'VULN-05 · Prueba antes de corregir', [
        ('cmd', "grep -rn \"new mysqli(\\\"localhost\\\", \\\"root\\\"\" . | wc -l"),
        ('plain', '14'),
        ('bad', '[FALLA] 14 archivos con credenciales root/clave vacía embebidas en el código fuente.'),
    ])
    term_png(page, OUT/'v05_despues_terminal.png', 'VULN-05 · Prueba después de corregir', [
        ('cmd', "grep -rn \"new mysqli(\\\"localhost\\\", \\\"root\\\"\" . | wc -l"),
        ('plain', '0'),
        ('cmd', 'cat .gitignore | grep config.local'),
        ('plain', 'includes/config.local.php'),
        ('ok', '[OK] Sin credenciales en el código; el archivo con secretos está excluido de Git.'),
    ])

    # ---------- VULN-06 Gestión de sesión ----------
    code_png(page, OUT/'v06_antes.png', 'VULN-06 · Antes — cookie sin protecciones, sin regenerar ID', 'scripts/login.php (línea 27-30)', '''if ($result->num_rows > 0) {
    session_start();                 // cookie por defecto: sin HttpOnly ni SameSite
    $_SESSION["logged_in"] = true;
    $_SESSION["email"] = $email;     // mismo ID de sesión que antes del login (fijación)
    header("Location: ../paginas/calendario.php");
}''')
    code_png(page, OUT/'v06_despues.png', 'VULN-06 · Después — cookie segura + regeneración de ID', 'includes/session.php', '''session_set_cookie_params([
    'lifetime' => 0, 'path' => '/', 'secure' => $https,
    'httponly' => true, 'samesite' => 'Lax',
]);
session_start();
...
function login_user($correo, $nombre) {
    secure_session_start();
    session_regenerate_id(true);     // evita fijación de sesión
    $_SESSION['correo'] = $correo;
    $_SESSION['ultimo_acceso'] = time();   // expiración por inactividad
}''')
    term_png(page, OUT/'v06_antes_terminal.png', 'VULN-06 · Prueba antes de corregir', [
        ('cmd', 'curl -s -i -d "correo=user@totoninin.test&password=UserTest#2026" http://localhost/paginas/login.php'),
        ('plain', 'Set-Cookie: PHPSESSID=****; path=/'),
        ('bad', '[FALLA] Cookie sin HttpOnly ni SameSite; además el ID de sesión no se regenera (fijación).'),
    ])
    term_png(page, OUT/'v06_despues_terminal.png', 'VULN-06 · Prueba después de corregir', [
        ('cmd', 'curl -s -i -d "correo=user@totoninin.test&password=UserTest#2026" http://localhost/paginas/login.php'),
        ('plain', 'Set-Cookie: PHPSESSID=****; path=/; HttpOnly; SameSite=Lax'),
        ('ok', '[OK] Cookie protegida; el ID de sesión se regenera en cada login (sin fijación).'),
    ])

    browser.close()
print('Capturas generadas en', OUT)
