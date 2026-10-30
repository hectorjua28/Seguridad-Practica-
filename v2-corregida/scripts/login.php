<?php
// VULN-01: consulta preparada + password_verify (antes: concatenacion y clave en texto plano)
require_once __DIR__ . '/../includes/db.php';
require_once __DIR__ . '/../includes/auth.php';

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $conn = db();
    $email = trim($_POST["email"] ?? '');
    $clave = $_POST["pass"] ?? '';

    $user = ($email !== '' && $clave !== '') ? authenticate($conn, $email, $clave) : null;

    if ($user) {
        login_user($user['email_us'], $user['Name_us']); // regenera el ID de sesion
        header("Location: ../paginas/calendario.php");
        exit;
    }
    http_response_code(401);
    header("Content-Type: application/json");
    echo json_encode(array("success" => false, "error" => "Credenciales incorrectas"));
    $conn->close();
    exit;
}
