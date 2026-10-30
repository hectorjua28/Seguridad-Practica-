<?php
if (!isset($_SESSION)) {
    session_start();
} ?>

<head>
<link rel="stylesheet" href="../css/normalize.css">
<link rel="stylesheet" href="../css/estilos.css">  
</head>

<header class="encabezado">
    <div class="contenedor-navegacion">
        <div class="contenido-navegacion contenedor">
            <div class="logo">
                <h2><span class="Verde">TotoNinin</span></h2>
            </div>
            <nav class="navegacion ocultar">
                <a href="../index.php">Inicio</a>
                <a href="../paginas/registro.php">Regístrate</a>
                <a href="../paginas/login.php">Iniciar Sesión</a>
                <a href="../paginas/calendario.php">Eventos</a>
                <a href="../paginas/preguntas.php">¿Necesitas ayuda?</a>
                <a href="../paginas/informacion.php">Servicios</a>
                <a href="../scripts/cerrar_sesion.php">Cerrar sesión</a>

                <?php if($_SESSION['correo'] == 'baldomeroyo@gmail.com' ){?> 
                 <a href="../paginas/admin.php">Modificar</a>
                <?php }?> 

                <p class="btn-cerrar">x</p>
            </nav>
            <div class="hamburguesa">
                <span></span><span></span><span></span>
            </div>
        </div>
    </div>
</header>

<script src="../js/app.js"></script>