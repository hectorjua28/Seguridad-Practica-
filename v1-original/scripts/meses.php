<?php
header('Content-Type: application/json');

if (!$result) {
    $error = array('error' => 'No se encontró...');
    echo json_encode($error);
    exit;
}

$meses = array(
    1 => "Enero",
    2 => "Febrero",
    3 => "Marzo",
    4 => "Abril",
    5 => "Mayo",
    6 => "Junio",
    7 => "Julio",
    8 => "Agosto",
    9 => "Septiembre",
    10 => "Octubre",
    11 => "Noviembre",
    12 => "Diciembre"
);

echo json_encode($meses);
exit; // or die();