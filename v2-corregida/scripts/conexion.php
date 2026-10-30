<?php
// VULN-05: las credenciales ya no estan en el codigo (ver includes/config.php)
require_once __DIR__ . '/../includes/db.php';
$conection = db();
