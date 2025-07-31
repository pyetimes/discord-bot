## Environment

```bash
cp .env.example .env
```  

## Endpoint
### POST `/article`
#### headers
```json
{ 
    "x-webhook-token": "SECRET TOKEN",
    "Content-Type": "application/json"
}
```
#### body
```json
{
    "title": "string",
    "url": "url",
    "description": "string",
    "image": "url or null",
    "thumbnail": "url or null",
    "author_name": "string or null",
    "author_icon": "url or null",
    "published": false
}
```


## Commands
### /restart
Reinicia el bot

---

### /ping

Retorna "pong!"

--- 


### /notify
Notificaciones de nuevas publicaciones

Subcomandos:
- **add**  
  Activa las notificaciones en un canal de texto  
  Uso:
  ```  
  /notify add channel:#channel_name
  ```
- **remove**  
  Desactiva las notificaciones en un canal de texto
  Uso:  
  ```  
  /notify remove channel:#channel_name
  ```
- **list**  
  Muestra todos los canales configurados para recibir notificaciones  
  Uso:
  ```  
  /notify list  
  ```

---

### /nperms
Gestión de permisos para el comando `notify`

Subcomandos:
- **add**  
  Otorga a un usuario permiso para gestionar notificaciones  
  Uso:  
  ```  
  /nperms add user:@user perm:ADD|REMOVE|LIST  
  ```
- **remove**  
  Revoca a un usuario el permiso para gestionar notificaciones  
  Uso:  
  ```  
  /nperms remove user:@user perm:ADD|REMOVE|LIST  
  ```

---

### /notify-review
Notificaciones de versiones en revisión (no publicadas aún)

Subcomandos:
- **add**  
  Activa las notificaciones en un canal de texto  
  Uso:  
  ```  
  /notify-review add channel:#channel_name
  ```
- **remove**  
  Desactiva las notificaciones en un canal de texto  
  Uso:  
  ```  
  /notify-review remove channel:#channel_name  
  ```
- **list**  
  Lista los canales configurados para recibir notificaciones de revisión  
  Uso:  
  ```  
  /notify-review list  
  ```

### /commands
Ver y configurar el despliegue de los slash commands

Subcomandos:
- **list**  
  Lista todos los comandos y su alcance (opcionalmente de uno en especifico)  
  Uso:  
  ```
  /commands list [command:name]
  ```

- **add**  
  Añade un comando a un servidor  
  Uso:  
  ```
  /commands add command:name server_id:ID
  ```

- **remove**  
  Elimina un comando de un servidor  
  Uso:  
  ```
  /commands remove command:name server_id:ID
  ```

- **global**  
  Hace que un comando sea global  
  Uso:  
  ```
  /commands global command:name
  ```