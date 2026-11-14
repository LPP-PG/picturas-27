const amqp = require('amqplib/callback_api');

const rabbit_host = process.env.RABBITMQ_HOST;
const rabbit_port = process.env.RABBITMQ_PORT;
const rabbit_username = process.env.RABBITMQ_USER;
const rabbit_password = process.env.RABBITMQ_PASS;
const exchange = "picturas";

const rabbit_mq_sv = `amqp://${rabbit_username}:${rabbit_password}@${rabbit_host}:${rabbit_port}`;

function send_rabbit_msg(msg, queue) {
    amqp.connect(rabbit_mq_sv, (err_sv, connection) => {
        if (err_sv) throw err_sv;
        
        connection.createChannel( (err_conn, channel) => {
            if (err_conn) throw err_conn;
            
            channel.assertExchange(exchange, 'direct', {
                durable: true
            });

            channel.publish(exchange, queue, Buffer.from(JSON.stringify(msg)));
        });
        
        setTimeout(() => {
            connection.close();
        }, 500);
    });
    
}

async function send_confirmed_msg(msg, queue) {
    const connection = await require('amqplib').connect(rabbit_mq_sv);
    connection.on('error', (err) => console.error("[rabbit] publisher connection:", err));
    try {
        const channel = await connection.createConfirmChannel();
        channel.on('error', (err) => console.error("[rabbit] publisher channel:", err));
        let unrouted = false;
        channel.on('return', () => { unrouted = true; });
        await new Promise((resolve, reject) => {
            channel.publish(exchange, queue, Buffer.from(JSON.stringify(msg)),
                { persistent: true, mandatory: true },
                (err) => err ? reject(err) : resolve());
        });
        if (unrouted) throw new Error('No queue bound for ' + queue);
    } finally {
        await connection.close().catch(() => {});
    }
}

function read_rabbit_msg(queue, callback, { serial = false, queueArguments } = {}) {
    amqp.connect(rabbit_mq_sv, (err_sv, connection) => {
        if (err_sv) throw err_sv;

        connection.createChannel((err_conn, channel) => {
            if (err_conn) throw err_conn;

            channel.assertExchange(exchange, 'direct', {
                durable: true
              });

            channel.assertQueue(queue, { durable: true, arguments: queueArguments }, (err_queue, q) => {
                if(err_queue) throw err_queue;

                if (serial) channel.prefetch(1);
                channel.consume(q.queue, (msg) => {
                    if (!msg) return;
                    if (serial) {
                        Promise.resolve().then(() => callback(msg)).then(
                            () => channel.ack(msg),
                            (err) => {
                                console.error("[rabbit] retrying video result:", err);
                                channel.nack(msg, false, true);
                            },
                        );
                    } else {
                        callback(msg);
                        channel.ack(msg);
                    }
                }, {
                    noAck: false
                });
            });
        });
    });
}

module.exports = { send_rabbit_msg, send_confirmed_msg, read_rabbit_msg };
