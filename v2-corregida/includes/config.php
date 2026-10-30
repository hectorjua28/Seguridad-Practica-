<?php
/**
 * Configuración central de TotoNinin.
 * Los secretos NO viven en el código: se leen de variables de entorno
 * (DB_HOST, DB_USER, DB_PASS, DB_NAME, ADMIN_EMAIL) o de includes/config.local.php,
 * archivo que está en .gitignore. Ver includes/config.local.example.php.
 */
function cfg($clave, $defecto = null) {
    static $local = null;
    if ($local === null) {
        $archivo = __DIR__ . '/config.local.php';
        $local = is_file($archivo) ? (require $archivo) : [];
    }
    $valor = getenv($clave);
    if ($valor !== false && $valor !== '') {
        return $valor;
    }
    return $local[$clave] ?? $defecto;
}
