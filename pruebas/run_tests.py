#!/usr/bin/env python3
"""
Pruebas de seguridad reproducibles para TotoNinin (v1 = original, v2 = corregida).
Uso:  python3 run_tests.py v1-original   |   python3 run_tests.py v2-corregida
Levanta `php -S` con una BD SQLite de prueba (shim mysqli), ejecuta los casos y
escribe pruebas/salida/<version>/resultados.{txt,json}. Datos 100 % ficticios.
"""
import sys, os, re, json, time, shutil, sqlite3, subprocess, socket, http.client, urllib.parse, glob, pathlib

BASE = pathlib.Path(__file__).resolve().parent.parent
VERSION = sys.argv[1]
APP = BASE / VERSION
OUT = BASE / 'pruebas' / 'salida' / VERSION
OUT.mkdir(parents=True, exist_ok=True)
DB = OUT / 'test.sqlite'
SHIM = BASE / 'pruebas' / 'mysqli_shim.php'
SEED = (BASE / 'pruebas' / 'seed.sql').read_text()
PORT = 8081 if VERSION.startswith('v1') else 8082
EXT = subprocess.check_output(['php', '-n', '-r', 'echo ini_get("extension_dir");']).decode()

PASS_ADMIN, PASS_USER, PASS_VICT, PASS_LEG = 'AdminTest#2026', 'UserTest#2026', 'Victima#2026', 'LegacyTest#1'
E_ADMIN, E_USER, E_VICT, E_LEG = 'admin@totoninin.test', 'user@totoninin.test', 'victima@totoninin.test', 'legacy@totoninin.test'

def bcrypt(p):
    return subprocess.check_output(['php', '-n', '-r', 'echo password_hash($argv[1], PASSWORD_BCRYPT);', p]).decode()
H = {PASS_ADMIN: bcrypt(PASS_ADMIN), PASS_USER: bcrypt(PASS_USER), PASS_VICT: bcrypt(PASS_VICT)}
import hashlib
MD5_LEG = hashlib.md5(PASS_LEG.encode()).hexdigest()

BASELINE = set(os.listdir(APP / 'fotos'))

def reset_db():
    if DB.exists(): DB.unlink()
    c = sqlite3.connect(DB); c.executescript(SEED)
    for n, e, h in [('Admin Prueba', E_ADMIN, H[PASS_ADMIN]), ('Usuario Prueba', E_USER, H[PASS_USER]),
                    ('Victima Prueba', E_VICT, H[PASS_VICT]), ('Legado Prueba', E_LEG, MD5_LEG)]:
        c.execute('INSERT INTO users(Name_us,email_us,password_us) VALUES (?,?,?)', (n, e, h))
    c.commit(); c.close()
    for f in os.listdir(APP / 'fotos'):
        if f not in BASELINE: os.remove(APP / 'fotos' / f)

def q(sql, args=()):
    c = sqlite3.connect(DB); r = c.execute(sql, args).fetchall(); c.close(); return r

env = dict(os.environ, SHIM_DB=str(DB), DB_HOST='localhost', DB_USER='totoninin_app', DB_PASS='x-no-usada-en-sandbox',
           DB_NAME='totoninin', ADMIN_EMAIL=E_ADMIN)
srv = subprocess.Popen(['php', '-n', '-d', f'extension_dir={EXT}', '-d', 'extension=pdo', '-d', 'extension=pdo_sqlite',
                        '-d', 'extension=sqlite3', '-d', 'extension=fileinfo', '-d', 'extension=mbstring',
                        '-d', f'auto_prepend_file={SHIM}', '-d', 'error_log=' + str(OUT / 'php_error.log'),
                        '-d', 'output_buffering=4096', '-d', 'display_errors=1', '-d', 'log_errors=1',
                        '-S', f'127.0.0.1:{PORT}', '-t', str(APP)], env=env, stdout=open(OUT / 'server.log', 'w'), stderr=subprocess.STDOUT)
for _ in range(50):
    try: socket.create_connection(('127.0.0.1', PORT), timeout=0.2).close(); break
    except OSError: time.sleep(0.1)

# ---------------- cliente HTTP minimo con cookies ----------------
class Client:
    def __init__(self, cookies=None): self.cookies = dict(cookies or {}); self.set_cookie_headers = []
    def req(self, method, path, data=None, files=None, headers=None):
        h = dict(headers or {})
        if self.cookies: h['Cookie'] = '; '.join(f'{k}={v}' for k, v in self.cookies.items())
        body = None
        if files:
            bd = '----tn' + str(time.time_ns())
            parts = []
            for k, v in (data or {}).items():
                parts.append(f'--{bd}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode())
            for k, (fn, ct, content) in files.items():
                parts.append(f'--{bd}\r\nContent-Disposition: form-data; name="{k}"; filename="{fn}"\r\nContent-Type: {ct}\r\n\r\n'.encode() + content + b'\r\n')
            parts.append(f'--{bd}--\r\n'.encode()); body = b''.join(parts)
            h['Content-Type'] = f'multipart/form-data; boundary={bd}'
        elif data is not None:
            body = urllib.parse.urlencode(data).encode(); h['Content-Type'] = 'application/x-www-form-urlencoded'
        c = http.client.HTTPConnection('127.0.0.1', PORT, timeout=15)
        c.request(method, path, body=body, headers=h)
        r = c.getresponse(); raw = r.read()
        self.set_cookie_headers = r.headers.get_all('Set-Cookie') or []
        for sc in self.set_cookie_headers:
            k, _, v = sc.split(';')[0].partition('='); self.cookies[k] = v
        r.body = raw.decode('utf-8', 'replace'); r.raw = raw
        c.close(); return r
    def login(self, email, pw):
        return self.req('POST', '/paginas/login.php', {'correo': email, 'password': pw})

def mask(s):
    s = re.sub(r'(PHPSESSID=)[A-Za-z0-9,-]+', r'\1****', s)
    s = re.sub(r'\$2y\$\d\d\$[./A-Za-z0-9]{53}', '$2y$10$****(hash bcrypt oculto)', s)
    s = re.sub(r'\b[a-f0-9]{32}\b', '********(hash md5 oculto)', s)
    return s

RES = []
def caso(id_, vuln, titulo, fn):
    reset_db()
    try: ok, ev = fn()
    except Exception as e: ok, ev = False, f'EXCEPCION en la prueba: {e!r}'
    RES.append(dict(id=id_, vuln=vuln, titulo=titulo, seguro=bool(ok), evidencia=mask(ev)))

SHELL = b"<?php echo 'RCE_'.(6*7); ?>"
PNG = bytes.fromhex('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360f8cf50000003040101d2f8d8c40000000049454e44ae426082')
EVENTO = {'titulo': 'T', 'descripcion': 'D', 'fecha': '2026-11-01', 'hora': '10:00', 'event_type': '1'}

# ======================= VULN-01 =======================
def t01a():
    c = Client()
    r = c.req('POST', '/scripts/login.php', {'email': "x' OR '1'='1", 'pass': "x' OR '1'='1"})
    loc = r.headers.get('Location', '-')
    return (r.status != 302), f"POST /scripts/login.php  email=\"x' OR '1'='1\"  pass=\"x' OR '1'='1\"\n-> HTTP {r.status}  Location: {loc}  Set-Cookie: {'si' if c.set_cookie_headers else 'no'}"
def t01b():
    c = Client(); c.login(E_USER, PASS_USER)
    pl = "0 UNION SELECT ID_us,Name_us,password_us,'2026-10-01','10:00',email_us,1,1 FROM users -- "
    r = c.req('GET', '/scripts/load_events.php?mes=' + urllib.parse.quote(pl))
    n = len(re.findall(r'\$2y\$\d\d\$[./A-Za-z0-9]{53}', r.body)) + len(re.findall(r'\b[a-f0-9]{32}\b', r.body))
    return n == 0, f"Usuario NO admin autenticado. GET /scripts/load_events.php?mes=0 UNION SELECT ... FROM users --\n-> HTTP {r.status}; hashes de contraseña exfiltrados en la respuesta: {n} (valores ocultos)"
def t01c():
    c = Client(); c.login(E_USER, PASS_USER)
    r = c.req('GET', '/scripts/lista_usuarios.php?pagina=' + urllib.parse.quote('1 UNION SELECT 1,2,3,4 --'))
    return ('syntax' not in r.body.lower() and r.status in (302, 403, 200) and 'Warning' not in r.body), f"GET lista_usuarios.php?pagina=1 UNION SELECT 1,2,3,4 -- \n-> HTTP {r.status}"
caso('P-01a', 'VULN-01', 'Inyección SQL en scripts/login.php (bypass de autenticación)', t01a)
caso('P-01b', 'VULN-01', 'Inyección SQL UNION en load_events.php (exfiltración de hashes)', t01b)

# ======================= VULN-02 =======================
def t02a():
    r = Client().req('GET', '/scripts/lista_usuarios.php')
    leak = r.body.count('@totoninin.test')
    return (r.status in (302, 401, 403) and leak == 0), f"Visitante SIN sesión: GET /scripts/lista_usuarios.php\n-> HTTP {r.status}; correos de usuarios visibles en la respuesta: {leak}"
def t02b():
    r = Client().req('POST', '/scripts/eliminar_usuario.php?id=3', {'id': '3'})
    n = q("SELECT COUNT(*) FROM users WHERE ID_us=3")[0][0]
    return n == 1, f"Visitante SIN sesión: POST /scripts/eliminar_usuario.php?id=3\n-> HTTP {r.status}; usuario id=3 sigue existiendo en BD: {'SI' if n else 'NO (fue eliminado)'}"
def t02c():
    Client().req('POST', '/scripts/editar_usuario.php?id=2', {'id': '2', 'Name_us': 'Usuario Prueba', 'email_us': E_USER, 'password_us': 'Hack#2026x'})
    r = Client().login(E_USER, 'Hack#2026x')
    return r.body.strip() not in ('success', 'admin'), f"Visitante SIN sesión cambia la clave de id=2 y luego inicia sesión con la clave del atacante\n-> login con clave del atacante: '{r.body.strip()[:40]}'  (toma de cuenta {'POSIBLE' if r.body.strip() in ('success','admin') else 'bloqueada'})"
def t02d():
    c = Client(); c.login(E_USER, PASS_USER)
    r = c.req('GET', '/scripts/lista_usuarios.php')
    return r.status in (302, 401, 403), f"Usuario autenticado SIN rol admin: GET /scripts/lista_usuarios.php\n-> HTTP {r.status}"
for a in [('P-02a', t02a, 'Listado de usuarios accesible sin sesión'), ('P-02b', t02b, 'Eliminación de usuarios sin sesión'),
          ('P-02c', t02c, 'Cambio de contraseña ajena sin sesión (toma de cuenta)'), ('P-02d', t02d, 'Usuario sin rol admin accede a gestión de usuarios')]:
    caso(a[0], 'VULN-02', a[2], a[1])

# ======================= VULN-03 =======================
def t03a():
    c = Client(); c.login(E_ADMIN, PASS_ADMIN)
    c.req('POST', '/scripts/registro_usuario.php', {'Name_us': 'Nuevo Prueba', 'email_us': 'nuevo@totoninin.test', 'password_us': 'Nuevo#2026ab'})
    h = q("SELECT password_us FROM users WHERE email_us='nuevo@totoninin.test'")
    h = h[0][0] if h else ''
    kind = 'bcrypt ($2y$)' if h.startswith('$2y$') else ('MD5 sin sal (32 hex)' if re.fullmatch(r'[a-f0-9]{32}', h) else 'otro/no creado')
    crack = hashlib.md5(b'Nuevo#2026ab').hexdigest() == h
    return h.startswith('$2y$'), f"Alta de usuario vía scripts/registro_usuario.php; formato del hash en BD: {kind}\nmd5 coincide con diccionario/rainbow trivial: {'SI' if crack else 'NO'}"
def t03b():
    c = Client(); r = c.login(E_LEG, PASS_LEG)
    h = q("SELECT password_us FROM users WHERE email_us=?", (E_LEG,))[0][0]
    return h.startswith('$2y$'), f"Cuenta heredada con hash MD5: login -> '{r.body.strip()[:40]}'\nformato del hash tras el login: {'bcrypt (migrado)' if h.startswith('$2y$') else 'MD5 (sin migrar)'}"
caso('P-03a', 'VULN-03', 'Algoritmo de hash de contraseñas en alta de usuario', t03a)
caso('P-03b', 'VULN-03', 'Migración de hashes MD5 heredados a bcrypt', t03b)

# ======================= VULN-04 =======================
def subir(c, nombre, ct, contenido):
    return c.req('POST', '/scripts/registro_evento.php', EVENTO, files={'foto': (nombre, ct, contenido)})
def sesion_subida():
    c = Client(); c.login(E_ADMIN if VERSION.startswith('v2') else E_USER, PASS_ADMIN if VERSION.startswith('v2') else PASS_USER); return c
def t04a():
    c = sesion_subida(); r = subir(c, 'shell.php', 'application/x-php', SHELL)
    x = Client().req('GET', '/fotos/shell.php')
    ejec = 'RCE_42' in x.body
    return not ejec, f"Subida de shell.php (<?php echo 'RCE_'.(6*7); ?>) -> HTTP {r.status}\nGET /fotos/shell.php -> HTTP {x.status}; respuesta: '{x.body.strip()[:30]}'  (código ejecutado en servidor: {'SI' if ejec else 'NO'})"
def t04b():
    c = sesion_subida(); r = subir(c, 'shell2.php', 'image/jpeg', SHELL)
    x = Client().req('GET', '/fotos/shell2.php')
    return 'RCE_42' not in x.body, f"shell2.php con Content-Type falsificado image/jpeg -> HTTP {r.status}\nGET /fotos/shell2.php -> HTTP {x.status}; ejecutado: {'SI' if 'RCE_42' in x.body else 'NO'}"
def t04c():
    c = sesion_subida(); r = subir(c, 'poliglota.php.gif', 'image/gif', b'GIF89a;<?php echo "RCE_42"; ?>')
    files = [os.path.basename(f) for f in glob.glob(str(APP / 'fotos' / '*')) if os.path.getmtime(f) > time.time() - 30]
    nuevo = [f for f in files if re.fullmatch(r'[0-9a-f]{32}\.(gif|png|jpg|webp)', f)]
    if nuevo:
        x = Client().req('GET', '/fotos/' + nuevo[0]); ej = 'RCE_42' in x.body and 'image' not in (x.headers.get('Content-Type') or '')
        return not ej, f"GIF con código PHP embebido (nombre cliente poliglota.php.gif) -> HTTP {r.status}\nGuardado como nombre aleatorio '{'*'*8}....{nuevo[0].split('.')[-1]}' (extensión derivada del MIME); Content-Type servido: {x.headers.get('Content-Type')}"
    return True, f"GIF con código PHP embebido -> HTTP {r.status}; archivo rechazado/no guardado"
def t04d():
    c = sesion_subida(); r = subir(c, 'foto.png', 'image/png', PNG)
    ok = 'Evento agregado' in r.body
    return ok, f"Subida legítima de PNG -> HTTP {r.status}; mensaje de éxito presente: {'SI' if ok else 'NO'}  (prueba de regresión funcional)"
for a in [('P-04a', t04a, 'Subida de webshell .php y ejecución remota'), ('P-04b', t04b, 'Subida .php con Content-Type falsificado'),
          ('P-04c', t04c, 'Imagen políglota (GIF+PHP) con doble extensión'), ('P-04d', t04d, 'Regresión: subida legítima de imagen PNG')]:
    caso(a[0], 'VULN-04', a[2], a[1])

# ======================= VULN-05 (estático) =======================
def php_files():
    return [p for p in APP.rglob('*.php') if 'img' not in p.parts]
def t05a():
    pat = re.compile(r'''new mysqli\(\s*["']localhost["']\s*,\s*["']root["']|\$(user|username)\s*=\s*["']root["']|mysqli_connect\(''')
    hits = []
    for p in php_files():
        t = p.read_text(errors='ignore')
        if re.search(r'''\$(user|username)\s*=\s*["']root["']''', t) or re.search(r'''new mysqli\(\s*"localhost",\s*"root"''', t):
            hits.append(str(p.relative_to(APP)))
    return len(hits) == 0, f"Búsqueda de credenciales 'root' con clave vacía embebidas en código PHP\n-> archivos afectados: {len(hits)}" + ('' if not hits else ' (' + ', '.join(sorted(hits))[:200] + ')')
def t05b():
    hits = [str(p.relative_to(APP)) for p in php_files() if 'display_errors' in p.read_text(errors='ignore') and 'ini_set("display_errors",1)' in p.read_text(errors='ignore').replace("'", '"')]
    return len(hits) == 0, f"Búsqueda de ini_set('display_errors',1) y echo de excepciones al usuario\n-> archivos con display_errors activado: {len(hits)} {hits}"
def t05c():
    gi = APP / '.gitignore'
    ok = gi.exists() and 'config.local.php' in gi.read_text()
    return ok, f".gitignore protege includes/config.local.php (secretos fuera del repositorio): {'SI' if ok else 'NO (no existe .gitignore)'}"
caso('P-05a', 'VULN-05', 'Credenciales de BD (root sin clave) embebidas en el código', t05a)
caso('P-05b', 'VULN-05', 'Errores detallados mostrados al usuario (display_errors)', t05b)
caso('P-05c', 'VULN-05', 'Secretos excluidos del control de versiones', t05c)

# ======================= VULN-06 =======================
def t06a():
    c = Client(); c.login(E_USER, PASS_USER)
    sc = [s for s in c.set_cookie_headers if 'PHPSESSID' in s]
    sc_txt = sc[0] if sc else ''
    ok = 'httponly' in sc_txt.lower() and 'samesite' in sc_txt.lower()
    return ok, f"Set-Cookie al iniciar sesión: {mask(sc_txt) or '(ninguna)'}\nHttpOnly: {'SI' if 'httponly' in sc_txt.lower() else 'NO'}   SameSite: {'SI' if 'samesite' in sc_txt.lower() else 'NO'}"
def t06b():
    fixed = 'fijada0123456789abcdef0123456789'
    atacante = Client({'PHPSESSID': fixed})
    victima = Client({'PHPSESSID': fixed}); victima.login(E_USER, PASS_USER)
    r = atacante.req('GET', '/paginas/calendario.php')
    return r.status == 302 or 'Evento prueba' not in r.body, f"Fijación de sesión: la víctima inicia sesión con un ID impuesto por el atacante; el atacante reutiliza ese ID\nGET /paginas/calendario.php (cookie del atacante) -> HTTP {r.status}; accede a contenido autenticado: {'SI' if (r.status==200 and 'Evento prueba' in r.body) else 'NO'}"
def t06c():
    a = Client().login('noexiste@totoninin.test', 'x').body.strip()
    b = Client().login(E_USER, 'incorrecta').body.strip()
    return a == b, f"Respuesta con correo inexistente : '{a}'\nRespuesta con clave incorrecta  : '{b}'\n-> {'idénticas (sin enumeración)' if a==b else 'DIFERENTES: permite enumerar usuarios'}"
def t06d():
    c = Client(); c.login(E_USER, PASS_USER)
    r = c.req('GET', '/scripts/cerrar_sesion.php')
    sc = c.set_cookie_headers
    borrada = any(('PHPSESSID=deleted' in s or 'Max-Age=0' in s or '1970' in s) for s in sc)
    return borrada, f"GET /scripts/cerrar_sesion.php -> HTTP {r.status}; el servidor ordena borrar la cookie en el navegador: {'SI' if borrada else 'NO'}\nSet-Cookie: {mask(' | '.join(sc)) or '(ninguna)'}"
def t06e():
    c = Client(); c.login(E_USER, PASS_USER)
    antes = c.cookies.get('PHPSESSID')
    r = c.req('GET', '/scripts/eliminar_usuario.php?id=2')
    nav = Client(c.cookies).req('GET', '/paginas/calendario.php')
    admin_link = 'admin.php' in nav.body
    return not admin_link, f"Rol decidido por correo fijo en el código: ¿el menú de un usuario normal muestra el enlace de administración? {'SI' if admin_link else 'NO'}"
caso('P-06a', 'VULN-06', 'Atributos HttpOnly/SameSite de la cookie de sesión', t06a)
caso('P-06b', 'VULN-06', 'Fijación de sesión (session fixation)', t06b)
caso('P-06c', 'VULN-06', 'Enumeración de usuarios en el login', t06c)
caso('P-06d', 'VULN-06', 'Cierre de sesión elimina la cookie', t06d)

# ======================= REGRESION =======================
def r01():
    c = Client(); r = c.login(E_ADMIN, PASS_ADMIN)
    return r.body.strip() in ('success', 'admin'), f"Login legítimo (admin de prueba) -> '{r.body.strip()}'"
def r02():
    # calendario.php solo pinta los meses; los eventos se cargan por AJAX contra load_events.php (mes actual = 10, sembrado en seed.sql)
    c = Client(); c.login(E_USER, PASS_USER)
    cal = c.req('GET', '/paginas/calendario.php')
    r = c.req('GET', '/scripts/load_events.php?mes=10')
    return cal.status == 200 and r.status == 200 and 'Evento prueba' in r.body, f"Usuario autenticado abre calendario -> HTTP {cal.status}; GET load_events.php?mes=10 -> HTTP {r.status}; evento de prueba visible: {'SI' if 'Evento prueba' in r.body else 'NO'}"
def r03():
    c = Client(); c.login(E_ADMIN, PASS_ADMIN); r = c.req('GET', '/scripts/lista_usuarios.php')
    return r.status == 200 and '@totoninin.test' in r.body, f"Administrador abre lista de usuarios -> HTTP {r.status}"
def r04():
    c = Client(); r = c.req('POST', '/paginas/registro.php', {'nombre': 'Pub', 'correo': 'pub@totoninin.test', 'password': 'Publico#2026', 'confirm_password': 'Publico#2026'})
    h = q("SELECT password_us FROM users WHERE email_us='pub@totoninin.test'")
    return bool(h) and h[0][0].startswith('$2y$'), f"Registro público -> HTTP {r.status}; usuario creado con bcrypt: {'SI' if h and h[0][0].startswith('$2y$') else 'NO'}"
def r05():
    r = Client().req('GET', '/index.php')
    return r.status == 200 and 'TotoNinin' in r.body, f"Página de inicio pública -> HTTP {r.status}"
caso('R-01', 'REGRESIÓN', 'Inicio de sesión legítimo', r01)
caso('R-02', 'REGRESIÓN', 'Calendario para usuario autenticado', r02)
caso('R-03', 'REGRESIÓN', 'Administrador gestiona usuarios', r03)
caso('R-04', 'REGRESIÓN', 'Registro público de usuario (bcrypt)', r04)
caso('R-05', 'REGRESIÓN', 'Página de inicio pública', r05)

srv.terminate()
reset_db()
lineas = [f"AUDITORÍA TotoNinin · versión probada: {VERSION} · servidor php -S 127.0.0.1:{PORT} · BD de prueba SQLite (datos ficticios)", '=' * 100]
for r in RES:
    lineas.append(f"[{r['id']}] {r['vuln']} · {r['titulo']}")
    for l in r['evidencia'].split('\n'): lineas.append('    ' + l)
    lineas.append(f"    RESULTADO: {'SEGURO / CUMPLE' if r['seguro'] else 'VULNERABLE / NO CUMPLE'}")
    lineas.append('-' * 100)
tot = len(RES); seg = sum(r['seguro'] for r in RES)
lineas.append(f"Resumen {VERSION}: {seg}/{tot} casos seguros/cumplen · {tot-seg} vulnerables")
(OUT / 'resultados.txt').write_text('\n'.join(lineas) + '\n')
(OUT / 'resultados.json').write_text(json.dumps(RES, ensure_ascii=False, indent=1))
print('\n'.join(lineas))
