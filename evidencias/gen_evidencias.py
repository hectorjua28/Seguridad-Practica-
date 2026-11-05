#!/usr/bin/env python3
"""Genera las capturas de código (aspecto Visual Studio Code, tema oscuro) y los paneles de resultado.
Las líneas se leen de los archivos reales de v1-original y v2-corregida, con su número de línea real."""
import pathlib, html, json
from pygments.lexers import PhpLexer, ApacheConfLexer
from pygments.token import Token
from playwright.sync_api import sync_playwright

BASE = pathlib.Path(__file__).resolve().parent.parent
OUT = BASE / 'evidencias'
FONT = "Consolas,'Liberation Mono','DejaVu Sans Mono',monospace"
FS = 15          # px; con escala 1 queda en ~11 pt dentro del documento
LH = 23

CONTROL = {'if', 'else', 'elseif', 'return', 'require_once', 'require', 'include', 'include_once', 'exit', 'die', 'foreach', 'while', 'for'}
def color(tok, val, sig):
    if tok in Token.Comment: return '#6a9955'
    if tok in Token.Keyword.Constant: return '#569cd6'
    if tok in Token.Keyword:
        return '#c586c0' if val.strip().lower() in CONTROL else '#569cd6'
    if tok in Token.String.Interpol: return '#9cdcfe'
    if tok in Token.String: return '#ce9178'
    if tok in Token.Number: return '#b5cea8'
    if tok in Token.Name.Variable: return '#9cdcfe'
    if tok in Token.Name.Constant: return '#4fc1ff'
    if tok in Token.Name.Class: return '#4ec9b0'
    if tok in Token.Name.Builtin or tok in Token.Name.Function: return '#dcdcaa'
    if tok in Token.Name:
        if sig == '(':
            return '#dcdcaa'
        return '#9cdcfe' if val.startswith('$') else '#d4d4d4'
    if tok in Token.Comment.Preproc: return '#569cd6'
    return '#d4d4d4'

def lineas_coloreadas(texto, lexer):
    """Devuelve una lista (una por línea) de HTML con los tokens coloreados estilo Dark+."""
    toks = list(lexer.get_tokens(texto))
    lineas, actual = [], []
    for i, (tok, val) in enumerate(toks):
        sig = next((v for t, v in toks[i+1:] if v.strip()), '')[:1]
        partes = val.split('\n')
        for k, parte in enumerate(partes):
            if k > 0:
                lineas.append(''.join(actual)); actual = []
            if parte:
                actual.append(f'<span style="color:{color(tok, parte, sig)}">{html.escape(parte)}</span>')
    lineas.append(''.join(actual))
    return lineas

def dedent(lineas_raw):
    exp = [l.replace('\t', '    ') for l in lineas_raw]
    ind = min((len(l) - len(l.lstrip(' ')) for l in exp if l.strip()), default=0)
    return ind

WIN = """<!doctype html><html><head><meta charset="utf-8"><style>
body{{margin:0;background:#1e1e1e}}
.win{{display:inline-block;min-width:{minw}px;background:#1e1e1e;font-family:'Segoe UI','DejaVu Sans',sans-serif}}
.tabs{{background:#252526;height:36px;display:flex}}
.tab{{background:#1e1e1e;color:#fff;font-size:13px;padding:0 16px;display:flex;align-items:center;gap:8px;border-top:2px solid #007acc}}
.tab b{{color:#a074c4;font-size:10px;font-weight:700}}
.bc{{color:#a9a9a9;font-size:12.5px;padding:6px 16px;background:#1e1e1e}}
.ed{{padding:6px 0 10px 0}}
table{{border-collapse:collapse;font-family:{font};font-size:{fs}px}}
td{{padding:0;height:{lh}px;line-height:{lh}px;white-space:pre-wrap;vertical-align:top}}
td.n{{color:#6e7681;text-align:right;padding:0 18px 0 14px;min-width:34px;user-select:none}}
td.c{{padding-right:24px;width:700px;max-width:700px;overflow-wrap:anywhere}}
tr.hl td{{background:{hl}}}
tr.hl td.n{{color:#c6c6c6;box-shadow:inset 3px 0 0 {bar}}}
tr.gap td{{color:#6e7681}}
.st{{background:#007acc;color:#fff;font-size:12px;height:22px;display:flex;align-items:center;justify-content:space-between;padding:0 12px}}
.pan{{padding:12px 20px 14px 20px;font-family:{font};font-size:{fs}px;line-height:{lh}px;color:#d4d4d4;white-space:pre-wrap;overflow-wrap:anywhere;width:750px}}
.lab{{color:#9cdcfe}} .bad{{color:#f48771;font-weight:bold}} .ok{{color:#89d185;font-weight:bold}} .dim{{color:#8b8b8b}}
.ptab{{background:#1e1e1e;color:#e7e7e7;font-size:12px;letter-spacing:.5px;padding:0 16px;display:flex;align-items:center;border-top:2px solid #007acc}}
</style></head><body><div class="win">{cuerpo}</div></body></html>"""

def ventana(cuerpo, hl='#5a1d1d88', bar='#f14c4c', minw=790):
    return WIN.format(cuerpo=cuerpo, font=FONT, fs=FS, lh=LH, hl=hl, bar=bar, minw=minw)

def shot(page, nombre, html_str, manifest):
    page.set_content(html_str, wait_until='load')
    el = page.query_selector('.win')
    el.screenshot(path=str(OUT / nombre))
    bb = el.bounding_box()
    manifest[nombre] = {'w': round(bb['width']), 'h': round(bb['height'])}

def codigo_png(page, manifest, nombre, version, ruta, rangos, resaltar, estado):
    src = (BASE / version / ruta).read_text(encoding='utf-8')
    lexer = ApacheConfLexer() if ruta.endswith('.htaccess') else PhpLexer(startinline=False)
    todas = lineas_coloreadas(src, lexer)
    crudas = src.split('\n')
    mostrar = []
    for k, (a, b) in enumerate(rangos):
        if k: mostrar.append(None)
        mostrar += list(range(a, b + 1))
    ind = dedent([crudas[n-1] for n in mostrar if n])
    filas = []
    for n in mostrar:
        if n is None:
            filas.append('<tr class="gap"><td class="n">⋮</td><td class="c"></td></tr>'); continue
        # quitar sangría común, conservando el color: se recorta en el texto crudo
        cruda = crudas[n-1].replace('\t', '    ')
        corte = min(ind, len(cruda) - len(cruda.lstrip(' ')))
        resto = cruda[corte:]
        # volver a colorear solo ese trozo de línea (se conserva el contexto con el color de la línea completa)
        html_linea = todas[n-1]
        html_linea = html_linea.replace('\t', '    ')
        # el HTML trae la sangría como primer span en blanco; recortar 'corte' espacios iniciales
        for _ in range(1):
            quitar = corte
            while quitar > 0 and html_linea.startswith('<span'):
                fin = html_linea.index('>') + 1
                cierre = html_linea.index('</span>')
                inner = html_linea[fin:cierre]
                if inner.strip(' ') == '' and inner:
                    t = min(len(inner), quitar); quitar -= t
                    rest = inner[t:]
                    html_linea = (f'<span style="color:#d4d4d4">{rest}</span>' if rest else '') + html_linea[cierre+7:]
                else:
                    plano = html.unescape(inner)
                    t = min(len(plano) - len(plano.lstrip(' ')), quitar); quitar -= t
                    html_linea = html_linea[:fin] + html.escape(plano[t:]) + html_linea[cierre:]
                    break
        cls = 'hl' if any(a <= n <= b for a, b in resaltar) else ''
        filas.append(f'<tr class="{cls}"><td class="n">{n}</td><td class="c">{html_linea}</td></tr>')
    partes = ruta.split('/')
    mig = ' <span style="color:#6e7681">›</span> '.join([version] + partes)
    icono = 'PHP' if not ruta.endswith('.htaccess') else 'CFG'
    cuerpo = (f'<div class="tabs"><div class="tab"><b>{icono}</b>{html.escape(partes[-1])}</div></div>'
              f'<div class="bc">{mig}</div><div class="ed"><table>{"".join(filas)}</table></div>'
              f'<div class="st"><span>{html.escape(version)}</span><span>{icono if icono=="PHP" else "Apache"}&nbsp;&nbsp; UTF-8 &nbsp;&nbsp; Espacios: 4</span></div>')
    if estado == 'antes':
        h = ventana(cuerpo)
    else:
        h = ventana(cuerpo, hl='#1f4d2a99', bar='#89d185')
    shot(page, nombre, h, manifest)

def panel_png(page, manifest, nombre, titulo, lineas, ok):
    cont = []
    for kind, a, *b in lineas:
        if kind == 'kv': cont.append(f'<span class="lab">{html.escape(a)}</span> {html.escape(b[0])}')
        elif kind == 'dim': cont.append(f'<span class="dim">{html.escape(a)}</span>')
        elif kind == 'res':
            cont.append(f'<span class="{"ok" if ok else "bad"}">{"✔" if ok else "✘"} {html.escape(a)}</span>')
        else: cont.append(html.escape(a))
    cuerpo = (f'<div class="tabs"><div class="ptab">RESULTADO DE LA PRUEBA</div></div>'
              f'<div class="bc">{html.escape(titulo)}</div><div class="pan">{chr(10).join(cont)}</div>'
              f'<div class="st"><span>Pruebas</span><span>{"CUMPLE" if ok else "NO CUMPLE"}</span></div>')
    shot(page, nombre, ventana(cuerpo, minw=790), manifest)

V1, V2 = 'v1-original', 'v2-corregida'
CODIGO = [  # nombre, versión, archivo, rangos, resaltar, estado
    ('v01_antes.png', V1, 'scripts/login.php', [(16, 33)], [(21, 23)], 'antes'),
    ('v01_despues.png', V2, 'scripts/login.php', [(6, 22)], [(11, 11)], 'despues'),
    ('v01_despues_auth.png', V2, 'includes/auth.php', [(30, 35)], [(31, 33)], 'despues'),
    ('v02_antes.png', V1, 'scripts/eliminar_usuario.php', [(1, 4), (28, 35)], [(2, 4), (32, 32)], 'antes'),
    ('v02_despues.png', V2, 'scripts/eliminar_usuario.php', [(1, 5), (30, 36)], [(2, 3)], 'despues'),
    ('v02_despues_auth.png', V2, 'includes/auth.php', [(16, 23)], [(17, 22)], 'despues'),
    ('v03_antes.png', V1, 'scripts/registro_usuario.php', [(15, 17), (27, 28)], [(17, 17)], 'antes'),
    ('v03_despues.png', V2, 'scripts/registro_usuario.php', [(16, 18), (27, 28)], [(18, 18)], 'despues'),
    ('v03_despues_auth.png', V2, 'includes/auth.php', [(40, 49)], [(43, 43), (46, 49)], 'despues'),
    ('v04_antes.png', V1, 'scripts/registro_evento.php', [(40, 48)], [(45, 48)], 'antes'),
    ('v04_despues.png', V2, 'includes/upload.php', [(8, 25)], [(15, 17), (20, 20)], 'despues'),
    ('v04_despues_htaccess.png', V2, 'fotos/.htaccess', [(2, 6)], [(2, 6)], 'despues'),
    ('v05_antes.png', V1, 'scripts/conexion.php', [(1, 12)], [(3, 6)], 'antes'),
    ('v05_despues.png', V2, 'scripts/conexion.php', [(1, 4)], [(2, 4)], 'despues'),
    ('v05_despues_config.png', V2, 'includes/config.php', [(8, 19)], [(14, 18)], 'despues'),
    ('v06_antes.png', V1, 'scripts/login.php', [(25, 32)], [(27, 29)], 'antes'),
    ('v06_despues.png', V2, 'includes/session.php', [(11, 21), (38, 47)], [(14, 19), (41, 41)], 'despues'),
]
PANELES = [
    ('v01_antes_resultado.png', 'VULN-01 · antes de corregir', False, [
        ('kv', 'Petición: ', "POST scripts/login.php"), ('kv', 'email = ', "x' OR '1'='1"), ('kv', 'pass  = ', "x' OR '1'='1"),
        ('kv', 'Respuesta: ', '302 Found, Location: ../paginas/calendario.php'), ('dim', 'Set-Cookie: PHPSESSID=****'),
        ('res', 'FALLA: entró sin credenciales válidas.')]),
    ('v01_despues_resultado.png', 'VULN-01 · después de corregir', True, [
        ('kv', 'Petición: ', "POST scripts/login.php"), ('kv', 'email = ', "x' OR '1'='1"), ('kv', 'pass  = ', "x' OR '1'='1"),
        ('kv', 'Respuesta: ', '401 Unauthorized'), ('dim', '{"success":false,"error":"Credenciales incorrectas"}'),
        ('res', 'OK: el texto se trata como texto normal y no se inicia sesión.')]),
    ('v02_antes_resultado.png', 'VULN-02 · antes de corregir', False, [
        ('kv', 'Petición: ', 'POST scripts/eliminar_usuario.php?id=3 (sin iniciar sesión)'),
        ('kv', 'Respuesta: ', '302 Found, Location: lista_usuarios.php'),
        ('res', 'FALLA: el usuario con id=3 se eliminó sin que nadie hubiera iniciado sesión.')]),
    ('v02_despues_resultado.png', 'VULN-02 · después de corregir', True, [
        ('kv', 'Petición: ', 'POST scripts/eliminar_usuario.php?id=3 (sin iniciar sesión)'),
        ('kv', 'Respuesta: ', '302 Found, Location: ../paginas/login.php'),
        ('res', 'OK: lo manda al login y el usuario sigue en la base de datos.')]),
    ('v03_antes_resultado.png', 'VULN-03 · antes de corregir', False, [
        ('kv', 'Consulta: ', "SELECT password_us FROM users WHERE email_us = 'nuevo@totoninin.test'"),
        ('kv', 'Resultado: ', '[hash MD5 de 32 caracteres, oculto]'),
        ('res', 'FALLA: MD5 sin sal, se puede descifrar con un diccionario en segundos.')]),
    ('v03_despues_resultado.png', 'VULN-03 · después de corregir', True, [
        ('kv', 'Consulta: ', "SELECT password_us FROM users WHERE email_us = 'nuevo@totoninin.test'"),
        ('kv', 'Resultado: ', '[hash bcrypt $2y$10$..., oculto]'),
        ('res', 'OK: bcrypt usa sal y es lento de adivinar, no se descifra con un diccionario.')]),
    ('v04_antes_resultado.png', 'VULN-04 · antes de corregir', False, [
        ('kv', 'Petición 1: ', 'POST registro_evento.php, foto = shell.php (tipo declarado: image/jpeg)'),
        ('kv', 'Petición 2: ', 'GET fotos/shell.php'),
        ('kv', 'Respuesta: ', 'RCE_42'),
        ('res', 'FALLA: el archivo .php subido se ejecutó en el servidor.')]),
    ('v04_despues_resultado.png', 'VULN-04 · después de corregir', True, [
        ('kv', 'Petición: ', 'POST registro_evento.php, foto = shell.php (tipo declarado: image/jpeg)'),
        ('kv', 'Respuesta: ', '400 Bad Request, "Error: archivo de imagen no válido"'),
        ('res', 'OK: se rechaza porque su contenido real no es una imagen y no se guarda.')]),
    ('v05_antes_resultado.png', 'VULN-05 · antes de corregir', False, [
        ('kv', 'Búsqueda en el código: ', 'new mysqli("localhost", "root"'),
        ('kv', 'Archivos con coincidencias: ', '14'),
        ('res', 'FALLA: usuario root y clave vacía escritos en 14 archivos.')]),
    ('v05_despues_resultado.png', 'VULN-05 · después de corregir', True, [
        ('kv', 'Búsqueda en el código: ', 'new mysqli("localhost", "root"'),
        ('kv', 'Archivos con coincidencias: ', '0'),
        ('kv', '.gitignore incluye: ', 'includes/config.local.php'),
        ('res', 'OK: no quedan credenciales en el código y el archivo con secretos no se sube a Git.')]),
    ('v06_antes_resultado.png', 'VULN-06 · antes de corregir', False, [
        ('kv', 'Petición: ', 'POST paginas/login.php (user@totoninin.test, clave de prueba oculta)'),
        ('kv', 'Respuesta: ', 'Set-Cookie: PHPSESSID=****; path=/'),
        ('res', 'FALLA: la cookie no tiene HttpOnly ni SameSite y el ID de sesión no cambia al entrar.')]),
    ('v06_despues_resultado.png', 'VULN-06 · después de corregir', True, [
        ('kv', 'Petición: ', 'POST paginas/login.php (user@totoninin.test, clave de prueba oculta)'),
        ('kv', 'Respuesta: ', 'Set-Cookie: PHPSESSID=****; path=/; HttpOnly; SameSite=Lax'),
        ('res', 'OK: la cookie queda protegida y se genera un ID nuevo en cada inicio de sesión.')]),
]

if __name__ == '__main__':
    manifest = {}
    with sync_playwright() as p:
        b = p.chromium.launch()
        page = b.new_page(viewport={'width': 1200, 'height': 200}, device_scale_factor=2)
        for c in CODIGO: codigo_png(page, manifest, *c)
        for n, t, ok, l in PANELES: panel_png(page, manifest, n, t, l, ok)
        b.close()
    (OUT / 'manifest.json').write_text(json.dumps(manifest, indent=1))
    print({k: (v['w'], v['h']) for k, v in manifest.items()})
