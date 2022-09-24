import { Command } from 'commander';
import * as express from 'express';
import * as https from 'https';
import { Server } from 'http';
import * as fs from 'fs';
import * as os from 'os';
import { createServer } from './server';
import { AddressInfo } from 'net';
import WSSignaling from './websocket';
import Options from './class/options';

export class RenderStreaming {
    public static run(argv: string[]): RenderStreaming {
        const program = new Command();
        const readOptions = (): Options => {
            if (Array.isArray(argv)) {
                program
                    .usage('[options] <apps...>')
                    .option('-s, --secure', 'Enable HTTPS (you need server.key and server.cert)', process.env.SECURE || false)
                    .option('-k, --keyfile <path>', 'https key file (default server.key)', process.env.KEYFILE || 'server.key')
                    .option('-c, --certfile <path>', 'https cert file (default server.cert)', process.env.CERTFILE || 'server.cert')
                    .option('-l, --logging <type>', 'Choose http logging type combined, dev, short, tiny or none.(default dev)', process.env.LOGGING || 'dev')
                    .parse(argv);
                const option = program.opts();
                return {
                    port: normalizePort(process.env.PORT || '80'),
                    secure: option.secure == undefined ? false : option.secure,
                    keyfile: option.keyfile,
                    certfile: option.certfile,
                    websocket: true,
                    mode: 'public',
                    logging: option.logging,
                };
            }
        };
        const options = readOptions();
        return new RenderStreaming(options);
    }

    public app: express.Application;

    public server?: Server;

    public options: Options;

    constructor(options: Options) {
        this.options = options;
        this.app = createServer(this.options);
        if (this.options.secure) {
            this.server = https.createServer({
                key: fs.readFileSync(options.keyfile),
                cert: fs.readFileSync(options.certfile),
            }, this.app).listen(this.options.port, () => {
                const { port } = this.server.address() as AddressInfo;
                const addresses = this.getIPAddress();
                for (const address of addresses) {
                    console.log(`https://${address}:${port}`);
                }
            });
        } else {
            this.server = this.app.listen(this.options.port, () => {
                const { port } = this.server.address() as AddressInfo;
                const addresses = this.getIPAddress();
                for (const address of addresses) {
                    console.log(`http://${address}:${port}`);
                }
            });
        }

        if (this.options.websocket) {
            console.log(`start websocket signaling server ws://${this.getIPAddress()[0]}`);
            //Start Websocket Signaling server
            new WSSignaling(this.server, this.options.mode);
        }

        console.log(`start as ${this.options.mode} mode`);
    }

    getIPAddress(): string[] {
        const interfaces = os.networkInterfaces();
        const addresses: string[] = [];
        for (const k in interfaces) {
            for (const k2 in interfaces[k]) {
                const address = interfaces[k][k2];
                if (address.family === 'IPv4') {
                    addresses.push(address.address);
                }
            }
        }
        return addresses;
    }
    
}
function normalizePort(val) {
    var port = parseInt(val, 10);

    if (isNaN(port)) {
        // named pipe
        return val;
    }

    if (port >= 0) {
        // port number
        return port;
    }

    return false;
}

RenderStreaming.run(process.argv);