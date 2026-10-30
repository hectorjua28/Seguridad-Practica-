<?php
// Iniciar sesión
require_once __DIR__ . '/../includes/session.php';
    secure_session_start();

// Verificar si el usuario está logueado
if (!isset($_SESSION["correo"])) {
    header("Location: login.php");
    exit;
}

// Mostrar el nombre del usuario
echo "Bienvenido, " . $_SESSION["nombre"];
?>