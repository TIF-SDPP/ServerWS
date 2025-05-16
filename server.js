  import amqp from "amqplib";
  import WebSocket, { WebSocketServer } from "ws";
  import 'dotenv/config'

  const RABBITMQ_URL = process.env.RABBITMQ_URL;
  const EXCHANGE_NAME = process.env.EXCHANGE_NAME;
  const ROUTING_KEY = process.env.ROUTING_KEY;
  console.log(RABBITMQ_URL)
  const wss = new WebSocketServer({ port: 80 });

  async function start() {
    try {
      const conn = await amqp.connect(RABBITMQ_URL);
      const ch = await conn.createChannel();
      await ch.assertExchange(EXCHANGE_NAME, "topic", { durable: true });
      const q = await ch.assertQueue(EXCHANGE_NAME);

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