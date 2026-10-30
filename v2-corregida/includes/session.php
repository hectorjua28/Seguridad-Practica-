<?php
require_once __DIR__ . '/config.php';

const SESION_INACTIVIDAD_MAX = 1800; // 30 minutos

/** Inicia la sesión con parámetros seguros (idempotente). */
function secure_session_start() {
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    $https = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    ini_set('session.use_strict_mode', '1');   // rechaza IDs de sesión no emitidos por el servidor
    ini_set('session.use_only_cookies', '1');
    session_set_cookie_params([
        'lifetime' => 0,
        'path'     => '/',
        'secure'   => $https,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();

    // Expiración por inactividad
    if (isset($_SESSION['ultimo_acceso']) && (time() - $_SESSION['ultimo_acceso']) > SESION_INACTIVIDAD_MAX) {
        $_SESSION = [];
        session_regenerate_id(true);
    }
    if (!empty($_SESSION['correo'])) {
        $_SESSION['ultimo_acceso'] = time();
    }
    if (!headers_sent()) {
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: SAMEORIGIN');
        header('Referrer-Policy: same-origin');
    }
}

/** Marca la sesión como autenticada y renueva el ID (evita fijación de sesión). */
function login_user($correo, $nombre) {
    secure_session_start();
    session_regenerate_id(true);
    $admin = cfg('ADMIN_EMAIL', '');
    $_SESSION['correo'] = $correo;
    $_SESSION['nombre'] = $nombre;
    $_SESSION['es_admin'] = ($admin !== '' && strcasecmp($correo, $admin) === 0);
    $_SESSION['ultimo_acceso'] = time();
}

/** Cierra la sesión en servidor y elimina la cookie del navegador. */
function logout_user() {
    secure_session_start();
    $_SESSION = [];
    $p = session_get_cookie_params();
    setcookie(session_name(), '', [
        'expires'  => time() - 42000,
        'path'     => $p['path'],
        'domain'   => $p['domain'],
        'secure'   => $p['secure'],
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_destroy();
}
