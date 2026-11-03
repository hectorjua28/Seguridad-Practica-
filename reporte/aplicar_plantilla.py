#!/usr/bin/env python3
"""
Vacía el contenido del reporte MASVS (generado por build_report.js) dentro de la
plantilla institucional U1Act3 (portada, encabezado/pie con logos, índice, estilos).

Uso:
  python3 aplicar_plantilla.py <plantilla.docx> <reporte_origen.docx> <salida.docx> [paginas.json]

- Conserva de la plantilla: estilos, tipografía (Arial 12), márgenes, encabezado y pie
  de página, portada e índice (campo TOC), viñetas.
- Solo cambia formato; el texto se copia tal cual, salvo: se quita la numeración de los
  títulos (decisión del alumno) y las referencias cruzadas "sección 3.1", "checklist 6.4"…
  se reescriben con el nombre de la sección correspondiente.
- paginas.json (opcional): {"Título de sección": número_de_página} para el índice.
"""
import sys, re, json, copy
from io import BytesIO
from docx import Document
from docx.shared import Pt, RGBColor, Emu
from docx.oxml import parse_xml
from docx.oxml.ns import qn, nsdecls

PLANTILLA, ORIGEN, SALIDA = sys.argv[1:4]
PAGINAS = json.load(open(sys.argv[4])) if len(sys.argv) > 4 else {}

GUINDA = '5B1234'          # color institucional (barra de encabezado/pie)
TEXT_W = 12240 - 1701 * 2  # ancho útil de la plantilla en twips (carta, márgenes 3 cm)
W = nsdecls('w')

REFS = [  # referencias cruzadas numeradas -> nombre de sección
    ('ver aclaración de alcance en 1.3.', 'ver la aclaración de alcance en «Aclaración de alcance: MASVS aplicado a una aplicación web».'),
    ('(ver sección 7)', '(ver «Entrega y repositorio»)'),
    ('(sección 7)', '(sección «Entrega y repositorio»)'),
    ('en el checklist de la sección 6.4', 'en el «Checklist MASVS»'),
    ('ver checklist 6.4', 'ver «Checklist MASVS»'),
    ('ver sección 3.1 y anexo de resultados', 'ver «Evidencia por hallazgo» y anexo de resultados'),
    ('descritos en la sección 5,', 'descritos en «Correcciones implementadas»,'),
]
def fix_refs(t):
    for a, b in REFS:
        t = t.replace(a, b)
    return t
def sin_numero(t):
    return re.sub(r'^\d+(\.\d+)*\.?\s+', '', t)

src = Document(ORIGEN)
doc = Document(PLANTILLA)
body = doc.element.body

# ------------------------------------------------------------------ portada
def set_par_text(p, lineas, size_resto=None):
    runs = p.runs
    rpr = copy.deepcopy(runs[0]._r.find(qn('w:rPr'))) if runs and runs[0]._r.find(qn('w:rPr')) is not None else None
    for r in runs[1:]:
        r._r.getparent().remove(r._r)
    runs[0].text = lineas[0]
    for linea in lineas[1:]:
        r = p.add_run()
        if rpr is not None:
            r._r.insert(0, copy.deepcopy(rpr))
        if size_resto:
            r.font.size = Pt(size_resto)
        r.add_break()
        r.add_text(linea)

pars = doc.paragraphs
assert pars[6].text.strip() == 'Creación de Videojuegos', pars[6].text
assert pars[9].text.strip() == 'Proceso de Planeación', pars[9].text
set_par_text(pars[6], ['Desarrollo Móvil Integral'])
# La tarea ocupa 3 líneas (la plantilla tenía 1): las líneas 2-3 van a 14 pt y los
# renglones vacíos separadores se reducen a 14 pt para que la portada siga en una sola hoja.
set_par_text(pars[9], ['Unidad II — Seguridad MASVS',
                       'Auditoría básica de seguridad con OWASP MASVS / MASTG',
                       '(aplicación propia: TotoNinin)'], size_resto=14)
pars[9]._p.pPr.find(qn('w:spacing')).set(qn('w:after'), '0')
for i in (1, 4, 7, 10, 13, 16, 18):
    assert not pars[i].text.strip()
    for sz in pars[i]._p.iter(qn('w:sz'), qn('w:szCs')):
        sz.set(qn('w:val'), '28')

# ------------------------------------------------------------------ cuerpo: vaciar lo posterior al índice
hijos = list(body.iterchildren())
i_sdt = next(i for i, e in enumerate(hijos) if e.tag == qn('w:sdt'))
sect = body.find(qn('w:sectPr'))
for e in hijos[i_sdt + 1:]:
    if e is not sect:
        body.remove(e)
sdt = hijos[i_sdt]

# ------------------------------------------------------------------ numeración decimal para "Reproducción"
num_part = doc.part.numbering_part.element
ABS = 90
num_part.insert(0, parse_xml(
    f'<w:abstractNum {W} w:abstractNumId="{ABS}"><w:multiLevelType w:val="singleLevel"/>'
    f'<w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/>'
    f'<w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum>'))
siguiente_num = [100]
def nuevo_num_decimal():
    nid = siguiente_num[0]; siguiente_num[0] += 1
    num_part.append(parse_xml(
        f'<w:num {W} w:numId="{nid}"><w:abstractNumId w:val="{ABS}"/>'
        f'<w:lvlOverride w:ilvl="0"><w:startOverride w:val="1"/></w:lvlOverride></w:num>'))
    return nid

# ------------------------------------------------------------------ utilidades de párrafo
def set_ppr(p, xml):
    old = p._p.find(qn('w:pPr'))
    if old is not None:
        p._p.remove(old)
    p._p.insert(0, parse_xml(f'<w:pPr {W}>{xml}</w:pPr>'))

def run_props(r_src):
    rpr = r_src.find(qn('w:rPr'))
    get = lambda tag: rpr is not None and rpr.find(qn(tag)) is not None and rpr.find(qn(tag)).get(qn('w:val'), 'true') not in ('false', '0')
    color = None; size = None
    if rpr is not None:
        c = rpr.find(qn('w:color')); s = rpr.find(qn('w:sz'))
        color = c.get(qn('w:val')) if c is not None else None
        size = int(s.get(qn('w:val'))) if s is not None else None
    return dict(bold=get('w:b'), italic=get('w:i'), color=color, size=size)

def src_runs(p_src):
    out = []
    for r in p_src.iter(qn('w:r')):
        t = ''.join(x.text or '' for x in r.iter(qn('w:t')))
        if t:
            out.append((fix_refs(t), run_props(r)))
    return out

def add_runs(p, runs, force_bold=None, size=None, color=None):
    for t, f in runs:
        r = p.add_run(t)
        r.bold = True if force_bold else (f['bold'] or None)
        r.italic = f['italic'] or None
        if size: r.font.size = Pt(size)
        elif f['size'] and f['size'] < 20: r.font.size = Pt(10)   # notas al pie del reporte original (9 pt) -> 10 pt
        c = color or (f['color'] if f['color'] not in (None, 'auto', '000000') else None)
        if c: r.font.color.rgb = RGBColor.from_string(c)

bm_id = [500]
def titulo_seccion(texto):
    """Título de sección = estilo 'Heading 2' de la plantilla (14 pt, negrita), en página nueva."""
    p = doc.add_paragraph()
    set_ppr(p, '<w:pStyle w:val="Heading2"/><w:pageBreakBefore/><w:spacing w:line="360" w:lineRule="auto"/>'
               '<w:rPr><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr>')
    name = f'_Toc_masvs_{bm_id[0]}'
    p._p.append(parse_xml(f'<w:bookmarkStart {W} w:id="{bm_id[0]}" w:name="{name}"/>'))
    r = p.add_run(texto); r.font.size = Pt(14)
    p._p.append(parse_xml(f'<w:bookmarkEnd {W} w:id="{bm_id[0]}"/>'))
    bm_id[0] += 1
    return name

def subtitulo(texto, antes=360):
    """Subtítulo = párrafo en negrita como 'Elementos clave…' de la plantilla."""
    p = doc.add_paragraph()
    set_ppr(p, f'<w:keepNext/><w:spacing w:before="{antes}" w:after="180" w:line="360" w:lineRule="auto"/><w:jc w:val="left"/>')
    r = p.add_run(texto); r.bold = True

def etiqueta(runs):
    p = doc.add_paragraph()
    set_ppr(p, '<w:keepNext/><w:spacing w:before="200" w:after="80" w:line="360" w:lineRule="auto"/><w:jc w:val="left"/>')
    add_runs(p, runs, force_bold=True)

def parrafo(runs):
    p = doc.add_paragraph()
    nota = all(f['size'] and f['size'] < 20 for _, f in runs)
    set_ppr(p, '<w:spacing w:before="0" w:after="160" w:line="360" w:lineRule="auto"/>' if not nota
               else '<w:spacing w:before="60" w:after="160" w:line="276" w:lineRule="auto"/>')
    add_runs(p, runs)

def vineta(runs):
    p = doc.add_paragraph()
    set_ppr(p, '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="9"/></w:numPr>'
               '<w:spacing w:before="120" w:after="0" w:line="360" w:lineRule="auto"/>'
               '<w:ind w:left="720" w:hanging="360"/><w:jc w:val="left"/>')
    texto = ''.join(t for t, _ in runs)
    m = re.match(r'^([^:]{2,45}:)(\s.*)$', texto)
    if m and len(runs) == 1:   # como la plantilla: rótulo antes de ":" en negrita
        add_runs(p, [(m.group(1), dict(runs[0][1], bold=True)), (m.group(2), runs[0][1])])
    else:
        add_runs(p, runs)

def numerado(runs, num_id):
    p = doc.add_paragraph()
    set_ppr(p, f'<w:numPr><w:ilvl w:val="0"/><w:numId w:val="{num_id}"/></w:numPr>'
               '<w:spacing w:before="120" w:after="0" w:line="360" w:lineRule="auto"/>'
               '<w:ind w:left="720" w:hanging="360"/><w:jc w:val="left"/>')
    add_runs(p, runs)

def espacio():
    p = doc.add_paragraph()
    set_ppr(p, '<w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:rPr><w:sz w:val="12"/></w:rPr>')

# ------------------------------------------------------------------ tablas
BORDE = 'w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"'
def set_tcw(tcpr, w):
    """Un solo <w:tcW>, como primer hijo de <w:tcPr> (orden exigido por el esquema)."""
    for old in tcpr.findall(qn('w:tcW')):
        tcpr.remove(old)
    tcpr.insert(0, parse_xml(f'<w:tcW {W} w:w="{w}" w:type="dxa"/>'))
def tabla_datos(tbl_src):
    filas = tbl_src.findall(qn('w:tr'))
    grid = [int(g.get(qn('w:w'))) for g in tbl_src.find(qn('w:tblGrid')).findall(qn('w:gridCol'))]
    tot = sum(grid); anchos = [round(g * TEXT_W / tot) for g in grid]
    # ancho mínimo por columna para que ninguna palabra se corte (p. ej. "RESILIENCE", "MASVS-PLATFORM")
    for c in range(len(grid)):
        palabras = [w for tr in filas for k, tc in enumerate(tr.findall(qn('w:tc'))) if k == c
                    for w in ''.join(t.text or '' for t in tc.iter(qn('w:t'))).split()]
        minimo = max((len(w) for w in palabras), default=0) * 125 + 240
        if anchos[c] < minimo <= TEXT_W * 0.3:   # rutas largas de archivos sí pueden partirse
            j = max(range(len(anchos)), key=lambda k: anchos[k])
            anchos[j] -= minimo - anchos[c]; anchos[c] = minimo
    anchos[-1] += TEXT_W - sum(anchos)
    juntar = len(filas) <= 4   # fichas y tablas cortas: no partirlas entre páginas
    t = doc.add_table(rows=len(filas), cols=len(grid))
    tbl = t._tbl
    tbl.remove(tbl.tblPr)
    tbl.insert(0, parse_xml(
        f'<w:tblPr {W}><w:tblW w:w="{TEXT_W}" w:type="dxa"/><w:tblInd w:w="0" w:type="dxa"/>'
        f'<w:tblBorders><w:top {BORDE}/><w:left {BORDE}/><w:bottom {BORDE}/><w:right {BORDE}/>'
        f'<w:insideH {BORDE}/><w:insideV {BORDE}/></w:tblBorders><w:tblLayout w:type="fixed"/>'
        f'<w:tblCellMar><w:top w:w="70" w:type="dxa"/><w:left w:w="100" w:type="dxa"/>'
        f'<w:bottom w:w="70" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr>'))
    g = tbl.find(qn('w:tblGrid'))
    for gc, w in zip(g.findall(qn('w:gridCol')), anchos):
        gc.set(qn('w:w'), str(w))
    for ri, (tr_src, row) in enumerate(zip(filas, t.rows)):
        if tr_src.find(qn('w:trPr')) is not None and tr_src.find(qn('w:trPr')).find(qn('w:tblHeader')) is not None:
            row._tr.insert(0, parse_xml(f'<w:trPr {W}><w:cantSplit/><w:tblHeader/></w:trPr>'))
        else:
            row._tr.insert(0, parse_xml(f'<w:trPr {W}><w:cantSplit/></w:trPr>'))
        for ci, (tc_src, cell) in enumerate(zip(tr_src.findall(qn('w:tc')), row.cells)):
            shd = tc_src.find('.//' + qn('w:shd'))
            fill = shd.get(qn('w:fill')) if shd is not None else None
            encabezado = fill and fill.upper() == '2E4057'
            if encabezado: fill = GUINDA
            tcpr = cell._tc.get_or_add_tcPr()
            set_tcw(tcpr, anchos[ci])
            if fill and fill.lower() != 'auto':
                tcpr.append(parse_xml(f'<w:shd {W} w:val="clear" w:color="auto" w:fill="{fill}"/>'))
            tcpr.append(parse_xml(f'<w:vAlign {W} w:val="center"/>'))
            ps_src = tc_src.findall(qn('w:p'))
            for k, p_src in enumerate(ps_src):
                p = cell.paragraphs[0] if k == 0 else cell.add_paragraph()
                jc = p_src.find('.//' + qn('w:jc'))
                jcv = jc.get(qn('w:val')) if jc is not None else 'left'
                if jcv in ('start', 'both'): jcv = 'left'
                keep = '<w:keepNext/>' if juntar and ri < len(filas) - 1 else ''
                set_ppr(p, f'{keep}<w:spacing w:before="0" w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="{jcv}"/>')
                add_runs(p, src_runs(p_src), size=10, color='FFFFFF' if encabezado else None)
    espacio()

def tabla_imagenes(tbl_src):
    """Par de capturas antes/después: tabla sin bordes de 2 columnas, como en el original."""
    blobs = []
    for d in tbl_src.iter(qn('w:drawing')):
        rid = d.find('.//{http://schemas.openxmlformats.org/drawingml/2006/main}blip').get(qn('r:embed'))
        ext = d.find('.//{http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing}extent')
        blobs.append((src.part.related_parts[rid].blob, int(ext.get('cx')), int(ext.get('cy'))))
    col = TEXT_W // 2
    t = doc.add_table(rows=1, cols=2)
    tbl = t._tbl
    tbl.remove(tbl.tblPr)
    nil = 'w:val="nil"'
    tbl.insert(0, parse_xml(
        f'<w:tblPr {W}><w:tblW w:w="{TEXT_W}" w:type="dxa"/><w:jc w:val="center"/>'
        f'<w:tblBorders><w:top {nil}/><w:left {nil}/><w:bottom {nil}/><w:right {nil}/><w:insideH {nil}/><w:insideV {nil}/></w:tblBorders>'
        f'<w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="60" w:type="dxa"/><w:right w:w="60" w:type="dxa"/></w:tblCellMar></w:tblPr>'))
    for gc in tbl.find(qn('w:tblGrid')).findall(qn('w:gridCol')):
        gc.set(qn('w:w'), str(col))
    t.rows[0]._tr.insert(0, parse_xml(f'<w:trPr {W}><w:cantSplit/></w:trPr>'))
    max_w = Emu((col - 140) * 635)   # ancho de celda menos márgenes
    for cell, (blob, cx, cy) in zip(t.rows[0].cells, blobs):
        set_tcw(cell._tc.get_or_add_tcPr(), col)
        p = cell.paragraphs[0]
        set_ppr(p, '<w:spacing w:before="40" w:after="40" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/>')
        w = min(cx, max_w)
        p.add_run().add_picture(BytesIO(blob), width=Emu(w), height=Emu(round(cy * w / cx)))
    espacio()

# ------------------------------------------------------------------ recorrido del reporte origen
def estilo(p_src):
    ppr = p_src.find(qn('w:pPr'))
    if ppr is None: return '', None
    ps = ppr.find(qn('w:pStyle')); np_ = ppr.find(qn('w:numPr'))
    return (ps.get(qn('w:val')) if ps is not None else ''), (np_.find(qn('w:numId')).get(qn('w:val')) if np_ is not None else None)

def es_decimal(num_id):
    n = src.part.numbering_part.element
    num = n.find(f'{qn("w:num")}[@{qn("w:numId")}="{num_id}"]')
    aid = num.find(qn('w:abstractNumId')).get(qn('w:val'))
    a = n.find(f'{qn("w:abstractNum")}[@{qn("w:abstractNumId")}="{aid}"]')
    return a.find('.//' + qn('w:numFmt')).get(qn('w:val')) == 'decimal'

hijos_src = list(src.element.body.iterchildren())
inicio = next(i for i, e in enumerate(hijos_src)
              if e.tag == qn('w:p') and estilo(e)[0] == 'Heading1'
              and ''.join(t.text or '' for t in e.iter(qn('w:t'))).startswith('1.'))

toc = []            # (texto, bookmark)
num_actual = None
for e in hijos_src[inicio:]:
    if e.tag == qn('w:sectPr'):
        continue
    if e.tag == qn('w:tbl'):
        num_actual = None
        (tabla_imagenes if e.find('.//' + qn('w:drawing')) is not None else tabla_datos)(e)
        continue
    st, num = estilo(e)
    runs = src_runs(e)
    texto = ''.join(t for t, _ in runs)
    if num is None or not es_decimal(num):
        num_actual = None
    if not texto.strip():
        continue                      # saltos de página manuales -> se usa "salto antes" en los títulos
    if st == 'Heading1':
        t = sin_numero(texto); toc.append((t, titulo_seccion(t)))
    elif st == 'Heading2':
        subtitulo(sin_numero(texto))
    elif st == 'Heading3':
        subtitulo(texto, antes=300)
    elif num is not None and es_decimal(num):
        if num_actual is None:
            num_actual = nuevo_num_decimal()
        numerado(runs, num_actual)
    elif num is not None:
        vineta(runs)
    elif all(f['bold'] for _, f in runs):
        etiqueta(runs)
    else:
        parrafo(runs)

# ------------------------------------------------------------------ índice (campo TOC de la plantilla)
content = sdt.find(qn('w:sdtContent'))
entradas = content.findall(qn('w:p'))
modelo_primero, modelo_resto = copy.deepcopy(entradas[0]), copy.deepcopy(entradas[1])
for p in entradas:
    content.remove(p)

def entrada(modelo, texto, anchor, pagina, cierre=False):
    p = copy.deepcopy(modelo)
    for tab in p.iter(qn('w:tab')):
        if tab.get(qn('w:pos')):
            tab.set(qn('w:pos'), str(TEXT_W))          # la plantilla tenía 12000 (fuera del margen)
    h = p.find(qn('w:hyperlink'))
    h.set(qn('w:anchor'), anchor)
    ts = h.findall('.//' + qn('w:t'))
    ts[0].text = texto
    ts[-1].text = str(pagina)
    if cierre:
        p.append(parse_xml(f'<w:r {W}><w:fldChar w:fldCharType="end"/></w:r>'))
    return p

for k, (texto, anchor) in enumerate(toc):
    modelo = modelo_primero if k == 0 else modelo_resto
    content.append(entrada(modelo, texto, anchor, PAGINAS.get(texto, ''), cierre=(k == len(toc) - 1)))

# ------------------------------------------------------------------ compatibilidad (errores heredados de la plantilla)
# La plantilla (exportada desde Google Docs) trae sangrías con decimales y márgenes sin "gutter",
# que no cumplen el esquema de Word. Se redondean / completan sin cambiar el aspecto.
for raiz in (doc.element, doc.styles.element):
    for el in raiz.iter():
        for k, v in list(el.attrib.items()):
            if re.fullmatch(r'-?\d+\.\d+', v) and k.startswith('{http://schemas.openxmlformats.org/wordprocessingml'):
                el.set(k, str(round(float(v))))
for pgmar in doc.element.iter(qn('w:pgMar')):
    pgmar.set(qn('w:gutter'), pgmar.get(qn('w:gutter'), '0'))

# ------------------------------------------------------------------ metadatos
cp = doc.core_properties
cp.title = 'Unidad II — Seguridad MASVS: auditoría de TotoNinin'
cp.author = 'Héctor Zahid Juárez Simbrón'
cp.last_modified_by = 'Héctor Zahid Juárez Simbrón'
cp.subject = 'Desarrollo Móvil Integral'

doc.save(SALIDA)
print('OK', SALIDA, '| secciones en índice:', [t for t, _ in toc])
