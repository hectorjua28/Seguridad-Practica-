<?php require_once __DIR__ . '/./includes/session.php';
    secure_session_start(); ?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>TotoNinin</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Arima+Madurai:wght@700&family=Mulish:wght@400;700&family=Open+Sans:wght@300&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="css/normalize.css">
    <link rel="stylesheet" href="css/estilos.css">
    <link rel="icon" href="img/logo.png">
</head>
<body>
    <header class="encabezado">
        <div class="contenedor-navegacion">
            <div class="contenido-navegacion contenedor">
                <div class="logo">
                    <h2><img src="/img/logo.png" alt=""><span class="Verde">TotoNinin</span></h2>
                </div>
                <nav class="navegacion ocultar">
                    <a href="index.php">Inicio</a>
                    <a href="paginas/registro.php">Regístrate</a>
                    <a href="paginas/login.php">Iniciar Sesión</a>
                    <a href="paginas/calendario.php">Eventos</a>
                    <a href="paginas/preguntas.php">¿Necesitas ayuda?</a>
                    <a href="paginas/informacion.php">Servicios</a>
                    <a href="#sobre-nosotros">Sobre Nosotros</a>
                    <p class="btn-cerrar">x</p>
                </nav>
                <div class="hamburguesa">
                    <span></span><span></span><span></span>
                </div>
            </div>
        </div>
        <div class="contenido-header">
            <div class="contenedor-encabezado">
                <div class="texto-encabezado">
                    <h2>¡Bienvenido!</h2>
                    <a href="paginas/login.php" class="btn bordes">Inicia Sesión</a>
                </div>
                <video autoplay loop muted>
                    <source src="img/Voladores de Papantla Drone Vistas aéreas.mp4">
                </video>
            </div>
        </div>
    </header>

    <section id="sobre-nosotros" class="sobre-nosotros">
        <div class="contenedor">
          <h2>Sobre Nosotros</h2>

          <div class="texto-sobre-nosotros">
            <p>En TotoNinin, nos dedicamos a organizar y promover eventos culturales y recreativos en la ciudad. Nuestro objetivo es ofrecer experiencias únicas y memorables a través de nuestras actividades. Contamos con un equipo comprometido y apasionado por la cultura y el entretenimiento.</p>
            <p>Desde festivales tradicionales hasta eventos contemporáneos, trabajamos para mantener viva la esencia de nuestra comunidad y crear un ambiente de alegría y convivencia. ¡Únete a nosotros y descubre todo lo que tenemos para ofrecer!</p>
            
          </div>
        </div>
      </section>

      <?php
// Conectar a la base de datos
require_once __DIR__ . '/./includes/db.php';
$conn = db();

// Verificar conexión
if ($conn->connect_error) {
    die("Error al conectar a la base de datos: " . $conn->connect_error);
}

// Obtener los eventos
$sql = "SELECT e.*, et.descripcion AS event_type_descripcion 
        FROM events e 
        INNER JOIN event_type et ON e.event_type = et.event_type";
$result = $conn->query($sql);

if ($result->num_rows > 0) {
    ?>
    <main>
        <section class="event-list">
            <h2>Próximos Eventos</h2>
            <ul>
                <?php
                while ($row = $result->fetch_assoc()) {
                    ?>
                    <li>
                        <div class="event-card">
                            <h1><?php echo htmlspecialchars($row['Titulo']) ?></h1>
                            <img src="<?php echo 'fotos/'.$row['photo']; ?>" alt="">
                            <h3><?php echo htmlspecialchars($row['Descripcion_event']) ?></h3>
                            <p>Fecha: <?php echo date('d/m/Y', strtotime($row['event_date'])) ?> </p>
                            <p>Hora: <?php echo $row['event_time'] ?></p>
                            <p>Tipo de evento: <?php echo htmlspecialchars($row['event_type_descripcion']) ?></p>
                        </div>
                    </li>
                    <?php
                }
                ?>
            </ul>
        </section>
    </main>
    <?php
} else {
    echo "No se encontraron eventos.";
}

// Cerrar la conexión
$conn->close();
?>


    <script src="js/app.js"></script>
</body>
<footer>
    <div class="footer-container">
        <div class="footer-section">
            <h4>Contacto</h4>
            <p>Email: contacto@totoninin.com</p>
            <p>Teléfono: +52 123 456 7890</p>
            <p>Dirección: Papantla, Veracruz, México</p>
        </div>
        <div class="footer-section">
            <h4>Enlaces Útiles</h4>
            <ul>
                <li><a href="#">Sobre Nosotros</a></li>
                <li><a href="#">Términos y Condiciones</a></li>
                <li><a href="#">Política de Privacidad</a></li>
                <li><a href="#">Ayuda</a></li>
            </ul>
        </div>
        <div class="footer-section">
            <h4>Síguenos</h4>
            <div class="social-media">
                <a href="#"><img src="https://cdn-icons-png.freepik.com/256/5968/5968764.png?semt=ais_hybrid" alt="Facebook"></a>
                <a href="#"><img src="https://img.freepik.com/vector-gratis/nuevo-diseno-icono-x-logotipo-twitter-2023_1017-45418.jpg?size=338&ext=jpg&ga=GA1.1.2008272138.1720742400&semt=ais_user" alt="Twitter"></a>
                <a href="#"><img src="https://static.vecteezy.com/system/resources/previews/023/741/058/non_2x/instagram-logo-icon-social-media-icon-free-png.png" alt="Instagram"></a>
                <a href="#"><img src="https://static.vecteezy.com/system/resources/previews/023/986/480/non_2x/youtube-logo-youtube-logo-transparent-youtube-icon-transparent-free-free-png.png" alt="YouTube"></a>
            </div>
        </div>
    </div>
    <div class="footer-bottom">
        <p>&copy; 2024 TotoNinin. Todos los derechos reservados.</p>
    </div>
</footer>

</html>
