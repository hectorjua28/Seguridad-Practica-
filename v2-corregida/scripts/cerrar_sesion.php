<?php
require_once __DIR__ . '/../includes/session.php';
logout_user(); // VULN-06: vacia $_SESSION, borra la cookie y destruye la sesion
header('Location: ../index.php');
exit;
