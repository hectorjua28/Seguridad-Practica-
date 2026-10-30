-- Esquema reconstruido a partir del código de TotoNinin (no se incluyó dump .sql en el ZIP)
CREATE TABLE users (ID_us INTEGER PRIMARY KEY AUTOINCREMENT, Name_us TEXT, email_us TEXT, password_us TEXT);
CREATE TABLE event_type (event_type INTEGER PRIMARY KEY AUTOINCREMENT, Descripcion TEXT);
CREATE TABLE events (ID_event INTEGER PRIMARY KEY AUTOINCREMENT, Titulo TEXT, Descripcion_event TEXT, event_date TEXT, event_time TEXT, photo TEXT, event_type INTEGER);
CREATE TABLE comments (ID_comment INTEGER PRIMARY KEY AUTOINCREMENT, ID_event INTEGER, comment TEXT);
INSERT INTO event_type(Descripcion) VALUES ('Deportivo'),('Cultural');
INSERT INTO events(Titulo,Descripcion_event,event_date,event_time,photo,event_type) VALUES ('Evento prueba','Descripcion de prueba',date('now'),'10:00','../fotos/futbol.jpg',1);
