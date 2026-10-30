<?php
require_once __DIR__ . '/../includes/auth.php';
require_admin(); // VULN-02: solo administradores

include "conexion.php";

if(empty($_GET['id'])){
    header("location: lista_eventos.php");
} else {
    $id_evento = $_GET['id'];
    if(!ctype_digit((string)$id_evento)){
        header("location: lista_eventos.php");
        exit;
    }

    $id_evento = (int)$id_evento;

    $query_evento = mysqli_query($conection, "SELECT Titulo, photo FROM events WHERE id_event = $id_evento");
    $result_evento = mysqli_num_rows($query_evento);

    if($result_evento > 0){
        $data_evento = mysqli_fetch_assoc($query_evento);
        $descripcion = $data_evento['Titulo'];
        $foto = $data_evento['photo'];
    } else {
        header("location: lista_eventos.php");
    }
}

if(!empty($_POST)){
    $id_evento = $_POST['id'];
    $id_evento = (int)$id_evento;

    $query_evento = mysqli_query($conection, "SELECT photo FROM events WHERE id_event = $id_evento");
    $result_evento = mysqli_num_rows($query_evento);

    if($result_evento > 0){
        $data_evento = mysqli_fetch_assoc($query_evento);
        $foto = $data_evento['photo'];

        $archivo = __DIR__ . '/../fotos/' . basename($foto); // sin path traversal
        if(basename($foto) != 'productos_default.png' && is_file($archivo)){
            unlink($archivo);
        }

        $query_delete = mysqli_query($conection, "DELETE FROM events WHERE id_event = $id_evento");

        if($query_delete){
            header("location: lista_eventos.php");
        } else {
            echo "Error al eliminar el evento";
        }
    } else {
        header("location: lista_eventos.php");
    }
}

?>

<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <?php include "../includes/scripts.php";?>
    <title>Eliminar Evento</title>
</head>
<body>
    <?php include "../includes/header.php";?>
    <section id="container">
        <div class="data_delete">
            <h2>¿Está seguro de eliminar el siguiente registro?</h2>
            <p>Descripción del evento: <span><?php echo $descripcion;?></span></p>
            <p>Foto del evento: <img src="<?php echo '../fotos/'.$foto;?>" alt="<?php echo $descripcion;?>"></p>
            
            <form method="post" action="">
                <input type="hidden" name="id" value="<?php echo $id_evento;?>">
                <a href="lista_eventos.php" class="btn_cancel">Cancelar</a>
                <input type="submit" value="Eliminar" class="btn_ok">
            </form>
        </div>
    </section>
</body>
</html>