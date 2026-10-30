<?php 
    session_start();

    include "conexion.php";   
?>


<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <?php include "../includes/scripts.php";?>
    <title>Lista de eventos</title>
</head>
<body>
    <?php include "../includes/header.php";?>
    <section id="container">
        
        <h1>Lista de eventos</h1>
        <a href="registro_evento.php" class="btn_new">Crear evento</a>
        
        

        <table>
            <tr>
                <th>ID</th>
                <th>Título</th>
                <th>Descripción</th>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Tipo de evento</th>
                <th>Foto</th>
                <th>Acciones</th>
            </tr>
        <?php 
            //Paginador
            $sql_registe = mysqli_query($conection,"SELECT COUNT(*) as total_registro FROM events");
            $result_register = mysqli_fetch_array($sql_registe);
            $total_registro = $result_register['total_registro'];

            $por_pagina = 5;

            if(empty($_GET['pagina']))
            {
                $pagina = 1;
            }else{
                $pagina = $_GET['pagina'];
            }

            $desde = ($pagina-1) * $por_pagina;
            $total_paginas = ceil($total_registro / $por_pagina);

            $query = mysqli_query($conection,"SELECT e.id_event, e.Titulo, e.Descripcion_event, e.event_date, e.event_time, et.descripcion as tipo_evento, e.photo, e.Titulo 
            FROM events e 
            inner join event_type et 
            on e.event_type = et.event_type 
            ORDER BY e.id_event ASC LIMIT $desde,$por_pagina");

            $result = mysqli_num_rows($query);
            if($result > 0){
                while ($data = mysqli_fetch_array($query)) {
                    if($data['photo']!= ''){
                        $foto = '../fotos/'.$data['photo'];
                    }else{
                        $foto = '../fotos/productos_default.png';
                    }
                    
      ?>
                    <tr>
                        <td><?php echo $data["id_event"];?></td>
                        <td><?php echo $data["Titulo"];?></td>
                        <td><?php echo $data["Descripcion_event"];?></td>
                        <td><?php echo $data["event_date"];?></td>
                        <td><?php echo $data["event_time"];?></td>
                        <td><?php echo $data["tipo_evento"];?></td>
						<td><img src="<?php echo $foto; ?>" alt="<?php echo htmlspecialchars($data['Descripcion_event']); ?>" width="100"></td>
						
                        <td>
							<a class="link_update" href="editar_evento.php?id=<?php echo $data["id_event"];?>">Editar</a>
							|
                            <a class="link_delete" href="eliminar_confirmar_evento.php?id=<?php echo $data["id_event"];?>">Eliminar</a>
                        </td>
                    </tr>
        <?php 
                }
            }
      ?>


        </table>
        <div class="paginador">
            <ul>
            <?php 
                if($pagina!= 1)
                {
              ?>
                <li><a href="?pagina=<?php echo 1;?>">|<</a></li>
                <li><a href="?pagina=<?php echo $pagina-1;?>"><<</a></li>
            <?php 
                }
                for ($i=1; $i <= $total_paginas; $i++) { 
                    # code...
                    if($i == $pagina)
                    {
                        echo '<li class="pageSelected">'.$i.'</li>';
                    }else{
                        echo '<li><a href="?pagina='.$i.'">'.$i.'</a></li>';
                    }
                }

                if($pagina!= $total_paginas)
                {
              ?>
                <li><a href="?pagina=<?php echo $pagina + 1;?>">>></a></li>
                <li><a href="?pagina=<?php echo $total_paginas;?> ">>|</a></li>
            <?php }?>
            </ul>
        </div>


    </section>
</body>
</html>

<?php 
    mysqli_close($conection);
?>