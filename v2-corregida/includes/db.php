<?php
require_once __DIR__ . '/config.php';

/**
 * Devuelve una conexión mysqli usando credenciales externas al código.
 * Ante un fallo registra el detalle en el log del servidor y muestra un mensaje genérico.
 */
function db() {
    mysqli_report(MYSQLI_REPORT_OFF);
    $c = @new mysqli(
        cfg('DB_HOST', 'localhost'),
        cfg('DB_USER', ''),
        cfg('DB_PASS', ''),
        cfg('DB_NAME', 'totoninin')
    );
    if ($c->connect_errno) {
        error_log('[totoninin] Error de conexión a la base de datos (' . $c->connect_errno . ')');
        http_response_code(500);
        exit('Servicio no disponible. Intente más tarde.');
    }
    $c->set_charset('utf8mb4');
    return $c;
}
