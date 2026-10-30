<?php
/**
 * Guarda la foto de un evento solo si es una imagen real.
 * Valida error de subida, tamaño, tipo MIME real (finfo), estructura de imagen
 * y genera un nombre aleatorio con extensión derivada del MIME (nunca la del cliente).
 * Devuelve la ruta relativa para guardar en BD o null si el archivo no es válido.
 */
function guardar_foto_evento($f) {
    if (!is_array($f) || ($f['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        return null;
    }
    if (!is_uploaded_file($f['tmp_name']) || $f['size'] > 2 * 1024 * 1024) {
        return null;
    }
    $permitidos = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/gif' => 'gif', 'image/webp' => 'webp'];
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($f['tmp_name']);
    if (!isset($permitidos[$mime]) || @getimagesize($f['tmp_name']) === false) {
        return null;
    }
    $nombre = bin2hex(random_bytes(16)) . '.' . $permitidos[$mime];
    if (!move_uploaded_file($f['tmp_name'], __DIR__ . '/../fotos/' . $nombre)) {
        return null;
    }
    return '../fotos/' . $nombre;
}
