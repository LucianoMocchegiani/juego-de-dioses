
 // levantar todas las imagenes
 docker-compose up -d

 // bajar de docker
 docker compose down 

 // mostrar logs
 docker-compose logs backend 

// mostrar log en riempo real
docker-compose logs -f backend

// resetar frontend para actualizar cambios
// NOTA: Los cambios en archivos JS/HTML se reflejan automáticamente (volumen montado)
// Solo necesitas reiniciar si cambias nginx.conf
docker-compose restart frontend

// resetar backend para actualizar cambios
docker-compose restart backend

// resetar backend y reconstruir imagen (si cambiaste Dockerfile o requirements.txt)
docker-compose up -d --build backend