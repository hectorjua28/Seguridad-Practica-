#!/usr/bin/env python3
"""Aplica sobre v2-corregida las correcciones VULN-01..06 (cada reemplazo se verifica)."""
import re, sys, pathlib
R = pathlib.Path('/home/claude/work/auditoria-totoninin/v2-corregida')

def rd(p):
    raw = (R/p).read_bytes().decode('utf-8')
    crlf = '\r\n' in raw
    return raw.replace('\r\n', '\n'), crlf
def wr(p, txt, crlf):
    if crlf: txt = txt.replace('\n', '\r\n')
    (R/p).write_bytes(txt.encode('utf-8'))
def sub(p, old, new, count=1, regex=False):
    t, c = rd(p)
    n = len(re.findall(old, t)) if regex else t.count(old)
    if n != count: sys.exit(f'ERROR {p}: esperaba {count} coincidencias de {old[:50]!r}, hubo {n}')
    t = re.sub(old, new, t) if regex else t.replace(old, new)
    wr(p, t, c)

def cortar(t, inicio, fin_marca, nuevo):
    """Reemplaza desde `inicio` hasta la ultima linea '\t\t}' (cierre del else) anterior a `fin_marca`."""
    a = t.index(inicio)
    m = t.index(fin_marca, a)
    b = t.rindex("\n\t\t}\n", a, m) + 1
    return t[:a] + nuevo + t[b:]

ADMIN = ['scripts/lista_usuarios.php','scripts/editar_usuario.php','scripts/eliminar_usuario.php','scripts/registro_usuario.php',
         'scripts/lista_categoria.php','scripts/editar_categoria.php','scripts/eliminar_categoria.php','scripts/registro_categoria.php',
         'scripts/lista_eventos.php','scripts/eliminar_confirmar_evento.php','scripts/editar_evento.php','scripts/registro_evento.php',
         'scripts/buscar_usuario.php','paginas/admin.php']
# ---------- VULN-02: control de acceso por rol en el servidor ----------
for f in ADMIN:
    sub(f, 'session_start();', "require_once __DIR__ . '/../includes/auth.php';\nrequire_admin(); // VULN-02: solo administradores")

# ---------- VULN-06: sesión segura en el resto de archivos ----------
for f, rel in [('index.php','.'),('scripts/load_events.php','..'),('scripts/obtener_eventos.php','..'),('scripts/evento_detalle.php','..'),
               ('scripts/add_comment.php','..'),('scripts/eventos.php','..'),('paginas/dashboard.php','..')]:
    sub(f, 'session_start();', f"require_once __DIR__ . '/{rel}/includes/session.php';\n    secure_session_start();")
for f in ['includes/header.php','includes/nav.php']:
    sub(f, 'session_start();', "require_once __DIR__ . '/session.php';\n    secure_session_start();")
sub('includes/nav.php', "$_SESSION['correo'] == 'baldomeroyo@gmail.com'", "!empty($_SESSION['es_admin'])")
(R/'scripts/cerrar_sesion.php').write_bytes(b"""<?php
require_once __DIR__ . '/../includes/session.php';
logout_user(); // VULN-06: vacia $_SESSION, borra la cookie y destruye la sesion
header('Location: ../index.php');
exit;
""".replace(b'\n', b'\r\n'))

# ---------- VULN-05: credenciales fuera del codigo ----------
(R/'scripts/conexion.php').write_bytes(b"""<?php
// VULN-05: las credenciales ya no estan en el codigo (ver includes/config.php)
require_once __DIR__ . '/../includes/db.php';
$conection = db();
""".replace(b'\n', b'\r\n'))
sub('bd_php/conexion.php', '$this->conn = new mysqli("localhost","root","","totoninin");', "require_once __DIR__ . '/../includes/db.php';\n            $this->conn = db();")
BLOQUE = r'\$servername = "localhost";\s*\$username = "root";\s*\$password = "";\s*\$dbname = "totoninin";\s*\$conn = new mysqli\(\$servername, \$username, \$password, \$dbname\);'
for f, rel in [('index.php','.'),('scripts/load_events.php','..'),('scripts/obtener_eventos.php','..'),('scripts/evento_detalle.php','..'),
               ('scripts/add_comment.php','..'),('scripts/eventos.php','..')]:
    sub(f, BLOQUE, f"require_once __DIR__ . '/{rel}/includes/db.php';\n$conn = db();", regex=True)
for f in ['scripts/editar_evento.php','scripts/registro_evento.php','paginas/registro.php','paginas/login.php']:
    sub(f, '$conn = new mysqli("localhost", "root", "", "totoninin");', "require_once __DIR__ . '/../includes/db.php';\n$conn = db();")
# registro.php (clase) usa su propia conexion
sub('scripts/registro.php', '$this->conn = new mysqli("localhost", "root", "", "totoninin");', "require_once __DIR__ . '/../includes/db.php';\n    $this->conn = db();")
# errores detallados al usuario -> log del servidor
t, c = rd('bd_php/usuarioBD.php')
t = t.replace('error_reporting(E_ALL);\nini_set("display_errors",1);\n', '// VULN-05: display_errors desactivado; los errores van al log del servidor\n')
t = t.replace('error_reporting(~E_NOTICE);\n', '')
t = t.replace('echo"Error al insertar". $e->getMessage();', "error_log('[totoninin] Error al insertar usuario: ' . $e->getMessage());\n            return 'No se pudo crear el usuario';")
t = t.replace('echo"Error al logearte". $e->getMessage();', "error_log('[totoninin] Error en login: ' . $e->getMessage());\n            return null;")
wr('bd_php/usuarioBD.php', t, c)

# ---------- VULN-01: inyeccion SQL ----------
(R/'scripts/login.php').write_bytes(b"""<?php
// VULN-01: consulta preparada + password_verify (antes: concatenacion y clave en texto plano)
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/auth.php';

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $conn = db();
    $email = trim($_POST["email"] ?? '');
    $clave = $_POST["pass"] ?? '';

    $user = ($email !== '' && $clave !== '') ? authenticate($conn, $email, $clave) : null;

    if ($user) {
        login_user($user['email_us'], $user['Name_us']); // regenera el ID de sesion
        header("Location: ../paginas/calendario.php");
        exit;
    }
    http_response_code(401);
    header("Content-Type: application/json");
    echo json_encode(array("success" => false, "error" => "Credenciales incorrectas"));
    $conn->close();
    exit;
}
""".replace(b'\n', b'\r\n'))

# registro_usuario.php (alta por admin): prepared + bcrypt  (VULN-01 / VULN-03)
t, c = rd('scripts/registro_usuario.php')

_i = "\t\t\t$Name_us = $_POST['Name_us'];"; _m = "?>"
nuevo = """\t\t\t$Name_us = trim($_POST['Name_us']);
\t\t\t$email_us = trim($_POST['email_us']);
\t\t\t$password_us = password_hash($_POST['password_us'], PASSWORD_DEFAULT); // VULN-03: bcrypt con sal (antes md5)

\t\t\t$st = $conection->prepare("SELECT 1 FROM users WHERE email_us = ?"); // VULN-01: consulta preparada
\t\t\t$st->bind_param("s", $email_us);
\t\t\t$st->execute();

\t\t\tif($st->get_result()->num_rows > 0){
\t\t\t\t$alert='<p class="msg_error">El correo electrónico ya existe.</p>';
\t\t\t}else{
\t\t\t\t$ins = $conection->prepare("INSERT INTO users(Name_us,email_us,password_us) VALUES(?,?,?)");
\t\t\t\t$ins->bind_param("sss", $Name_us, $email_us, $password_us);
\t\t\t\tif($ins->execute()){
\t\t\t\t\t$alert='<p class="msg_save">Usuario creado correctamente.</p>';
\t\t\t\t}else{
\t\t\t\t\t$alert='<p class="msg_error">Error al crear el usuario.</p>';
\t\t\t\t}
\t\t\t}
"""
t = cortar(t, _i, _m, nuevo)
wr('scripts/registro_usuario.php', t, c)

# registro.php (clase legado)
sub('scripts/registro.php', """    $password = md5($password);
    $sql = "INSERT INTO users (Name_us, email_us, password_us) VALUES ('$nombre', '$correo', '$password')";
    $result = $this->conn->query($sql);
    if ($result) {""", """    $password = password_hash($password, PASSWORD_DEFAULT); // VULN-03 (antes md5)
    $st = $this->conn->prepare("INSERT INTO users (Name_us, email_us, password_us) VALUES (?, ?, ?)"); // VULN-01
    $st->bind_param("sss", $nombre, $correo, $password);
    if ($st->execute()) {""")

# editar_usuario.php
t, c = rd('scripts/editar_usuario.php')
_i = "\t\t\t$idUser = $_POST['id'];"; _m = "//Mostrar Datos"
nuevo = """\t\t\t$idUser = (int)$_POST['id'];
\t\t\t$Name_us = trim($_POST['Name_us']);
\t\t\t$email_us = trim($_POST['email_us']);
\t\t\t$password_us = password_hash($_POST['password_us'], PASSWORD_DEFAULT); // VULN-03

\t\t\t$st = $conection->prepare("SELECT 1 FROM users WHERE email_us = ? AND ID_us != ?"); // VULN-01
\t\t\t$st->bind_param("si", $email_us, $idUser);
\t\t\t$st->execute();

\t\t\tif($st->get_result()->num_rows > 0){
\t\t\t\t$alert='<p class="msg_error">El correo electrónico ya existe.</p>';
\t\t\t}else{
\t\t\t\t$up = $conection->prepare("UPDATE users SET Name_us = ?, email_us = ?, password_us = ? WHERE ID_us = ?");
\t\t\t\t$up->bind_param("sssi", $Name_us, $email_us, $password_us, $idUser);
\t\t\t\tif($up->execute()){
\t\t\t\t\t$alert='<p class="msg_save">Usuario actualizado correctamente.</p>';
\t\t\t\t}else{
\t\t\t\t\t$alert='<p class="msg_error">Error al actualizar el usuario.</p>';
\t\t\t\t}
\t\t\t}
"""
t = cortar(t, _i, _m, nuevo)
t = t.replace("$idUser = $_REQUEST['id'];", "$idUser = (int)$_REQUEST['id'];")
wr('scripts/editar_usuario.php', t, c)

# registro_categoria.php
t, c = rd('scripts/registro_categoria.php')
_i = "\t\t\t$descripcion = $_POST['descripcion'];"; _m = "?>"
nuevo = """\t\t\t$descripcion = trim($_POST['descripcion']);

\t\t\t$st = $conection->prepare("SELECT 1 FROM event_type WHERE descripcion = ?"); // VULN-01
\t\t\t$st->bind_param("s", $descripcion);
\t\t\t$st->execute();

\t\t\tif($st->get_result()->num_rows > 0){
\t\t\t\t$alert='<p class="msg_error">El tipo de evento ya existe.</p>';
\t\t\t}else{
\t\t\t\t$ins = $conection->prepare("INSERT INTO event_type(descripcion) VALUES(?)");
\t\t\t\t$ins->bind_param("s", $descripcion);
\t\t\t\tif($ins->execute()){
\t\t\t\t\t$alert='<p class="msg_save">Tipo de evento creado correctamente.</p>';
\t\t\t\t}else{
\t\t\t\t\t$alert='<p class="msg_error">Error al crear el tipo de evento.</p>';
\t\t\t\t}
\t\t\t}
"""
t = cortar(t, _i, _m, nuevo)
wr('scripts/registro_categoria.php', t, c)

# editar_categoria.php
t, c = rd('scripts/editar_categoria.php')
_i = "\t\t\t$id_event_type = $_POST['id'];"; _m = "//Mostrar Datos"
nuevo = """\t\t\t$id_event_type = (int)$_POST['id'];
\t\t\t$descripcion = trim($_POST['descripcion']);

\t\t\t$st = $conection->prepare("SELECT 1 FROM event_type WHERE descripcion = ? AND event_type != ?"); // VULN-01
\t\t\t$st->bind_param("si", $descripcion, $id_event_type);
\t\t\t$st->execute();

\t\t\tif($st->get_result()->num_rows > 0){
\t\t\t\t$alert='<p class="msg_error">La descripción ya existe.</p>';
\t\t\t}else{
\t\t\t\t$up = $conection->prepare("UPDATE event_type SET descripcion = ? WHERE event_type = ?");
\t\t\t\t$up->bind_param("si", $descripcion, $id_event_type);
\t\t\t\tif($up->execute()){
\t\t\t\t\t$alert='<p class="msg_save">Tipo de evento actualizado correctamente.</p>';
\t\t\t\t}else{
\t\t\t\t\t$alert='<p class="msg_error">Error al actualizar el tipo de evento.</p>';
\t\t\t\t}
\t\t\t}
"""
t = cortar(t, _i, _m, nuevo)
t = t.replace("$id_event_type = $_REQUEST['id'];", "$id_event_type = (int)$_REQUEST['id'];")
wr('scripts/editar_categoria.php', t, c)

# parametros numericos: cast + exit tras redirect
sub('scripts/load_events.php', "$mes = $_GET['mes'];", "$mes = (int)($_GET['mes'] ?? 0); // VULN-01: parametro numerico")
sub('scripts/obtener_eventos.php', "$mes = $_GET['mes'];", "$mes = (int)($_GET['mes'] ?? 0); // VULN-01: parametro numerico")
for f in ['scripts/lista_usuarios.php','scripts/lista_categoria.php','scripts/lista_eventos.php']:
    sub(f, "$pagina = $_GET['pagina'];", "$pagina = max(1, (int)$_GET['pagina']); // VULN-01: LIMIT numerico")
for f, var in [('scripts/eliminar_usuario.php','id_usuario'),('scripts/eliminar_categoria.php','id_event_type'),('scripts/eliminar_confirmar_evento.php','id_evento')]:
    t, c = rd(f)
    t = t.replace(f"${var} = $_GET['id'];\n    if(!is_numeric(${var})){{", f"${var} = $_GET['id'];\n    if(!ctype_digit((string)${var})){{")
    t = re.sub(r'(header\("location: [a-z_]+\.php"\);)(\n    \}\n\n    \$)', r'\1\n        exit;\2', t)
    t = t.replace(f"${var} = mysqli_real_escape_string($conection, ${var});", f"${var} = (int)${var};")
    wr(f, t, c)
sub('scripts/eliminar_confirmar_evento.php', "SELECT Descripcion_event, photo FROM events", "SELECT Titulo, photo FROM events")
sub('scripts/eliminar_confirmar_evento.php', "if($foto!= 'productos_default.png'){\n            unlink('../fotos/'.$foto);\n        }",
    "$archivo = __DIR__ . '/../fotos/' . basename($foto); // sin path traversal\n        if(basename($foto) != 'productos_default.png' && is_file($archivo)){\n            unlink($archivo);\n        }")

# ---------- VULN-04: subida de archivos ----------
for f in ['scripts/registro_evento.php','scripts/editar_evento.php']:
    sub(f, """  $rutaTemporal = $foto['tmp_name'];
  $rutaDestino = '../fotos/' . $foto['name'];
  move_uploaded_file($rutaTemporal, $rutaDestino);""", """  // VULN-04: validar que sea imagen real y guardar con nombre aleatorio
  require_once __DIR__ . '/../includes/upload.php';
  $rutaDestino = guardar_foto_evento($foto);
  if ($rutaDestino === null) {
    http_response_code(400);
    echo "Error: archivo de imagen no válido";
    exit;
  }""")

# ---------- VULN-06: login con sesion segura y mensajes genericos ----------
t, c = rd('paginas/login.php')
a = t.index("  // Verificar si el correo electrónico existe")
b = t.index("// Cerrar conexión")
nuevo = """  // VULN-01/06: consulta preparada, mensaje generico y regeneracion del ID de sesion
  require_once __DIR__ . '/../includes/auth.php';
  $user = authenticate($conn, trim($correo), $password);
  if ($user) {
    login_user($user['email_us'], $user['Name_us']);
    echo !empty($_SESSION['es_admin']) ? "admin" : "success";
    exit;
  }
  http_response_code(401);
  echo "Error: Credenciales incorrectas";
  exit;
}

"""
t = t[:a] + nuevo + t[b:]
t = t.replace("$correo = $_POST['correo'];\n  $password = $_POST['password'];", "$correo = $_POST['correo'] ?? '';\n  $password = $_POST['password'] ?? '';")
wr('paginas/login.php', t, c)

t, c = rd('paginas/login.js')
a = t.index('    if (data === "Error: Campos vac')
b = t.index('  })\n  .catch')
nuevo = """    var mensaje = document.getElementById("mensaje");
    if (data === "success") {
      window.location.href = "calendario.php";
    } else if (data === "admin") {
      window.location.href = "admin.php";
    } else {
      mensaje.textContent = data; // textContent: no interpreta HTML
    }
"""
t = t[:a] + nuevo + t[b:]
t = t.replace('document.getElementById("mensaje").innerHTML = "Error: Campos vacíos";', 'document.getElementById("mensaje").textContent = "Error: Campos vacíos";')
wr('paginas/login.js', t, c)

# registro publico: sesion segura no aplica; ya usaba bcrypt + prepared.
print('OK: correcciones aplicadas')
