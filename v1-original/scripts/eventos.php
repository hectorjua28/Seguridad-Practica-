<?php

if (!isset($_SESSION)) {
    session_start();
}

if (!isset($_SESSION['correo'])) {
  // Si no hay sesión activa, redirigir a la página de login
  header("Location: login.php");
  exit;
}

// Conectar a la base de datos
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "totoninin";

$conn = new mysqli($servername, $username, $password, $dbname);

// Verificar conexión
if ($conn->connect_error) {
    die("Error al conectar a la base de datos: " . $conn->connect_error);
}

// Obtener los eventos del mes actual
$mes_actual = date('m');
$anio_actual = date('Y');
$eventos_del_mes = array();

$sql = "SELECT e.*, et.Descripcion AS event_type_description
        FROM events e
        INNER JOIN event_type et ON e.event_type = et.event_type
        WHERE MONTH(e.event_date) = $mes_actual AND YEAR(e.event_date) = $anio_actual";
$result = $conn->query($sql);

if ($result->num_rows > 0) {
    // Agregar los eventos a un array
    while($row = $result->fetch_assoc()) {
        $eventos_del_mes[] = $row;
    }
} else {
    echo "No se encontraron eventos para el mes actual.";
}



$meses = array(
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre'
);

function getEventsByMonth($mes) {
    global $conn;
    $anio_actual = date('Y');
    $eventos_del_mes = array();

    $sql = "SELECT e.*, et.Descripcion AS event_type_description
            FROM events e
            INNER JOIN event_type et ON e.event_type = et.event_type
            WHERE MONTH(e.event_date) = $mes AND YEAR(e.event_date) = $anio_actual";
    $result = $conn->query($sql);

    if ($result->num_rows > 0) {
        while($row = $result->fetch_assoc()) {
            $eventos_del_mes[] = $row;
        }
    } else {
        echo "No se encontraron eventos para el mes seleccionado.";
    }

    return $eventos_del_mes;
}

?>

<style>
  .filter {
    margin-bottom: 20px;
  }

  .filter label {
    font-weight: bold;
    margin-right: 10px;
  }

  #event-type {
    padding: 10px;
    border: none;
    border-radius: 5px;
    width: 200px;
    font-size: 16px;
  }

  #filter-btn {
    background-color: #4CAF50;
    color: #fff;
    padding: 10px 20px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
  }

  #filter-btn:hover {
    background-color: #3e8e41;
  }

  .months span.underline {
  text-decoration: underline;
  text-decoration-color: #56f532;
}
</style>

<main>
    <h2 id="mes-titulo">Eventos Programados</h2>
    <div class="months">
        <?php foreach ($meses as $i => $mes): ?>
            <span data-mes="<?php echo $i + 1; ?>" <?php if ($i + 1 == date('n')): ?>class="underline"<?php endif; ?>><?php echo substr($mes, 0, 3); ?></span>
        <?php endforeach; ?>
    </div>

    <div class="event-container" id="event-container">
        <!-- Aquí se cargarán los eventos -->
    </div>

    <script>

        const months = document.querySelectorAll('.months span');
        const eventContainer = document.getElementById('event-container');

        months.forEach((month) => {
            month.addEventListener('click', () => {
                const mes = month.getAttribute('data-mes');
                loadEvents(mes);
            });
        });

        function loadEvents(mes) {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', '../scripts/load_events.php?mes=' + mes, true);
            xhr.onload = function() {
                if (xhr.status === 200) {
                    eventContainer.innerHTML = xhr.responseText;
                }
            };
            xhr.send();
        }
    </script>
</main>
<?php
// Cerrar la conexión
$conn->close();
?>