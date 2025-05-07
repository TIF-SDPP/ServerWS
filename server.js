const amqp = require("amqplib");
const WebSocket = require("ws");

const RABBITMQ_URL = "amqp://guest:guest@34.74.155.113:5672";
const EXCHANGE_NAME = "workers_queue";
const ROUTING_KEY = "hash_task";

// Crear servidor WebSocket
const wss = new WebSocket.Server({ port: 80 });

async function start() {
  try {
    const conn = await amqp.connect(RABBITMQ_URL);
    const ch = await conn.createChannel();
    await ch.assertExchange(EXCHANGE_NAME, "topic", { durable: true });
    const q = await ch.assertQueue("", { exclusive: true });

    await ch.bindQueue(q.queue, EXCHANGE_NAME, ROUTING_KEY);

    console.log("Esperando mensajes de RabbitMQ...");

    ch.consume(q.queue, (msg) => {
      if (msg) {
        const data = JSON.parse(msg.content.toString());
        console.log("Mensaje recibido:", data);

        // Enviar el mensaje a todos los clientes WebSocket
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
          }
        });

        ch.ack(msg);
      }
    });
  } catch (error) {
    console.error("Error conectando a RabbitMQ:", error);
  }
}

start();

// const http = require("http");
// const amqp = require("amqplib");
// const WebSocket = require("ws");

// const RABBITMQ_URL = "amqp://guest:guest@service-rabbitmq.default.svc.cluster.local:5672";
// const EXCHANGE_NAME = "workers_queue";
// const ROUTING_KEY = "hash_task";

// const server = http.createServer(); // Servidor HTTP base
// const wss = new WebSocket.Server({ server });

// wss.on("connection", (ws) => {
//   console.log("Cliente WebSocket conectado");
// });

// async function start() {
//   try {
//     const conn = await amqp.connect(RABBITMQ_URL);
//     const ch = await conn.createChannel();
//     await ch.assertExchange(EXCHANGE_NAME, "topic", { durable: true });
//     const q = await ch.assertQueue("", { exclusive: true });

//     await ch.bindQueue(q.queue, EXCHANGE_NAME, ROUTING_KEY);

//     console.log("Esperando mensajes de RabbitMQ...");

//     ch.consume(q.queue, (msg) => {
//       if (msg) {
//         const data = JSON.parse(msg.content.toString());
//         console.log("Mensaje recibido:", data);

//         // Difundir a todos los clientes conectados
//         wss.clients.forEach((client) => {
//           if (client.readyState === WebSocket.OPEN) {
//             client.send(JSON.stringify(data));
//           }
//         });

//         ch.ack(msg);
//       }
//     });

//     // Iniciar el servidor HTTP en puerto 80 (requerido para el Service + Ingress)
//     server.listen(80, () => {
//       console.log("Servidor WebSocket escuchando en puerto 80 (/ws)");
//     });
//   } catch (error) {
//     console.error("Error conectando a RabbitMQ:", error);
//   }
// }

// start();