<?php
/**
 * mysqli_shim.php - SOLO PARA PRUEBAS EN SANDBOX (no forma parte de la app).
 * Emula el subconjunto de mysqli que usa TotoNinin sobre SQLite, porque en el
 * entorno de auditoría no se pudo instalar MariaDB/MySQL. PHP se ejecuta con
 * `php -n` (sin la extensión mysqli) y este archivo se carga con auto_prepend_file.
 */
class mysqli_sql_exception extends RuntimeException {}
function __shim_pdo() {
    static $p = null;
    if (!$p) {
        $p = new PDO('sqlite:' . getenv('SHIM_DB'));
        $p->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $p->sqliteCreateFunction('MONTH', fn($d) => (int)date('n', strtotime($d)), 1);
        $p->sqliteCreateFunction('YEAR', fn($d) => (int)date('Y', strtotime($d)), 1);
        $p->sqliteCreateFunction('md5', fn($s) => md5((string)$s), 1);
    }
    return $p;
}
class mysqli_result {
    public $num_rows = 0; private $rows; private $i = 0;
    function __construct($rows) { $this->rows = $rows; $this->num_rows = count($rows); }
    function fetch_assoc() { return $this->rows[$this->i++] ?? null; }
    function fetch_array() { $r = $this->fetch_assoc(); if (!$r) return null; return $r + array_values($r); }
    function fetch_all() { return $this->rows; }
}
class mysqli_stmt {
    public $affected_rows = 0; public $error = ''; private $st; private $vars = [];
    function __construct($st) { $this->st = $st; }
    function bind_param($types, &...$vars) { $this->vars = &$vars; return true; }
    function execute() {
        $i = 1; foreach ($this->vars as $v) { $this->st->bindValue($i++, $v); }
        $this->st->execute(); $this->affected_rows = $this->st->rowCount(); return true;
    }
    function get_result() { return new mysqli_result($this->st->fetchAll(PDO::FETCH_ASSOC)); }
    function close() { return true; }
}
class mysqli {
    public $connect_error = null, $connect_errno = 0, $error = '', $affected_rows = 0;
    function __construct($h = null, $u = null, $p = null, $d = null) {}
    function query($sql) {
        try {
            $st = __shim_pdo()->query($sql);
            if (preg_match('/^\s*select/i', $sql)) return new mysqli_result($st->fetchAll(PDO::FETCH_ASSOC));
            $this->affected_rows = $st->rowCount(); return true;
        } catch (Throwable $e) { $this->error = $e->getMessage(); return false; }
    }
    function prepare($sql) { return new mysqli_stmt(__shim_pdo()->prepare($sql)); }
    function real_escape_string($s) { return str_replace("'", "''", (string)$s); }
    function set_charset($c) { return true; }
    function close() { return true; }
}
function mysqli_connect($h = null, $u = null, $p = null, $d = null) { return new mysqli(); }
function mysqli_query($c, $q) { return $c->query($q); }
function mysqli_num_rows($r) { return $r ? $r->num_rows : 0; }
function mysqli_fetch_assoc($r) { return $r->fetch_assoc(); }
function mysqli_fetch_array($r) { return $r->fetch_array(); }
function mysqli_real_escape_string($c, $s) { return $c->real_escape_string($s); }
function mysqli_close($c) { return true; }
function mysqli_error($c = null) { return $c ? $c->error : ''; }
function mysqli_report($f) { return true; }
foreach (['MYSQLI_REPORT_OFF'=>0,'MYSQLI_REPORT_ERROR'=>1,'MYSQLI_REPORT_STRICT'=>2,'MYSQLI_REPORT_INDEX'=>4,'MYSQLI_REPORT_ALL'=>255] as $k=>$v) if (!defined($k)) define($k,$v);
