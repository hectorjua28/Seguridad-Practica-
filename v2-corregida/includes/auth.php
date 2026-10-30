<?php
require_once __DIR__ . '/session.php';

// Hash ficticio para igualar el tiempo de respuesta cuando el correo no existe.
const HASH_SENUELO = '$2y$10$FZIqSR5VgbfXSCv/zYiJp.jeCewukMV4SDL5j3kh8I00HVXKymA9q';

/** Exige sesión iniciada; si no, redirige al login. */
function require_login() {
    secure_session_start();
    if (empty($_SESSION['correo'])) {
        header('Location: ../paginas/login.php');
        exit;
    }
}

/** Exige sesión iniciada Y rol administrador (control de acceso en el servidor). */
function require_admin() {
    require_login();
    if (empty($_SESSION['es_admin'])) {
        http_response_code(403);
        exit('Acceso denegado');
    }
}

/**
 * Verifica credenciales con consulta preparada y password_verify().
 * Si la cuenta tiene un hash MD5 heredado, lo acepta una vez y lo migra a bcrypt.
 * Devuelve la fila del usuario o null (sin distinguir "correo inexistente" de "clave incorrecta").
 */
function authenticate($conn, $correo, $clave) {
    $st = $conn->prepare('SELECT ID_us, Name_us, email_us, password_us FROM users WHERE email_us = ?');
    $st->bind_param('s', $correo);
    $st->execute();
    $fila = $st->get_result()->fetch_assoc();

    if (!$fila) {
        password_verify($clave, HASH_SENUELO);
        return null;
    }
    $hash = $fila['password_us'];
    $ok = false;
    $migrar = false;
    if (password_verify($clave, $hash)) {
        $ok = true;
        $migrar = password_needs_rehash($hash, PASSWORD_DEFAULT);
    } elseif (preg_match('/^[a-f0-9]{32}$/i', $hash) && hash_equals(strtolower($hash), md5($clave))) {
        $ok = true;
        $migrar = true;
    }
    if (!$ok) {
        return null;
    }
    if ($migrar) {
        $nuevo = password_hash($clave, PASSWORD_DEFAULT);
        $up = $conn->prepare('UPDATE users SET password_us = ? WHERE ID_us = ?');
        $up->bind_param('si', $nuevo, $fila['ID_us']);
        $up->execute();
    }
    return $fila;
}
