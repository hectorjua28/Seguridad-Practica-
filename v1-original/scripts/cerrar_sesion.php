<?php
session_start();
session_destroy();
header('Location: ../index.php'); // Redirigir al usuario a la página de inicio
exit;
?>