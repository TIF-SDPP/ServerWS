  // import amqp from "amqplib";
  // import WebSocket, { WebSocketServer } from "ws";
  // import 'dotenv/config'

  // const RABBITMQ_URL = process.env.RABBITMQ_URL;
  // const EXCHANGE_NAME = process.env.EXCHANGE_NAME;
  // const ROUTING_KEY = process.env.ROUTING_KEY;
  // console.log(RABBITMQ_URL)
  // const wss = new WebSocketServer({ port: 80 });

  // async function start() {
  //   try {
  //     const conn = await amqp.connect(RABBITMQ_URL);
  //     const ch = await conn.createChannel();
  //     await ch.assertExchange(EXCHANGE_NAME, "topic", { durable: true });
  //     const q = await ch.assertQueue(EXCHANGE_NAME);

  //     await ch.bindQueue(q.queue, EXCHANGE_NAME, ROUTING_KEY);

  //     console.log("Esperando mensajes de RabbitMQ...");

  //     ch.consume(q.queue, (msg) => {
  //       if (msg) {
  //         const data = JSON.parse(msg.content.toString());
  //         console.log("Mensaje recibido:", data);

  //         // Enviar el mensaje a todos los clientes WebSocket
  //         let delivered = false;
  //         wss.clients.forEach((client) => {
  //           if (client.readyState === WebSocket.OPEN) {
  //             client.send(JSON.stringify(data));
  //             delivered = true;
  //           }
  //         });

  //         if (delivered) {
  //           console.log("Mensaje enviado, enviando ACK...");
  //           ch.ack(msg);
  //         } else {
  //           console.log("No hay workers activos, enviando NACK...");
  //           ch.nack(msg);
  //         }
  //       }
  //     });
  //   } catch (error) {
  //     console.error("Error conectando a RabbitMQ:", error);
  //   }
  // }

  // start();

import amqp from "amqplib";
import WebSocket, { WebSocketServer } from "ws";
import 'dotenv/config';

const RABBITMQ_URL = process.env.RABBITMQ_URL;
const EXCHANGE_NAME = process.env.EXCHANGE_NAME;
const ROUTING_KEY = process.env.ROUTING_KEY;

const RECONNECT_INTERVAL_MS = 5000;

const wss = new WebSocketServer({ port: 80 });

async function connectToRabbitMQ() {
  let conn = null;
  let ch = null;

  while (!conn) {
    try {
      console.log("Conectando a RabbitMQ...");
      conn = await amqp.connect(RABBITMQ_URL);
      ch = await conn.createChannel();
      await ch.assertExchange(EXCHANGE_NAME, "topic", { durable: true });
      const q = await ch.assertQueue(EXCHANGE_NAME, { exclusive: false });
      await ch.bindQueue(q.queue, EXCHANGE_NAME, ROUTING_KEY);
      console.log("Conectado y escuchando mensajes...");

      conn.on("error", (err) => {
        console.error("Error en conexión:", err);
        conn = null;
        ch = null;
        setTimeout(connectToRabbitMQ, RECONNECT_INTERVAL_MS);
      });

      conn.on("close", () => {
        console.warn("Conexión cerrada. Reintentando...");
        conn = null;
        ch = null;
        setTimeout(connectToRabbitMQ, RECONNECT_INTERVAL_MS);
      });

      ch.consume(q.queue, (msg) => {
        if (msg) {
          const data = JSON.parse(msg.content.toString());
          console.log("Mensaje recibido:", data);

          let delivered = false;
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify(data));
              delivered = true;
            }
          });

          if (delivered) {
            ch.ack(msg);
          } else {
            ch.nack(msg);
          }
        }
      });

    } catch (err) {
      console.error("Fallo al conectar. Reintentando en 5s...", err);
      await new Promise(res => setTimeout(res, RECONNECT_INTERVAL_MS));
    }
  }
}

connectToRabbitMQ();

