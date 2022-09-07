import * as fs from 'fs';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import fileUpload from 'express-fileupload';
import https from 'https';
import * as mime from 'mime-types';

import { Config } from './server.js';

export default class FileServer {
    private app: express.Application;
    private _events = {};

    constructor() {

        // express server with one GET route
        this.app = express();
        this.app.use(cors());
        this.app.use(bodyParser.json());

        this.app.use(fileUpload({
            createParentPath: true
        }));


        this.app.listen(Config.fileServer.port, function () {
            console.log(`[File] Server listening on port ${Config.fileServer.port}.`);
        });


        let options = {};
        if (Config.fileServer.cert && Config.fileServer.key) {
            // check if those files exist
            if (fs.existsSync(Config.fileServer.cert) && fs.existsSync(Config.fileServer.key)) {
                options = {
                    cert: fs.readFileSync(Config.fileServer.cert, 'utf8'),
                    key: fs.readFileSync(Config.fileServer.key, 'utf8'),
                };

                https.createServer(options, this.app).listen(Config.fileServer.httpsPort, () => {
                    console.log(`[File] Server listening on port ${Config.fileServer.httpsPort}.`);
                });
            } else {
                console.log(`[File] Couldn't find cert or key files. HTTPS won't be available.`);
            }
        }


        this.app.get(`/ping`, (req, res) => {
            res.send('pong');
        });


        this.app.get(`/`, (req, res) => {
            if (Config.fileServer.rootUploadPage) {
                // convert Config.fileServer.homePageDir to an absolute path base on the current working directory
                const homePage = `${process.cwd()}/${Config.fileServer.homePage}`;
                res.sendFile(homePage);
                return;
            }

            if (Config.fileServer.rootRedirect) {
                res.redirect(302, Config.fileServer.rootRedirect);
                return;
            }

            res.status(404).send('Not found.');

        });

        this.app.post(`/upload`, (req, res) => {
            if (!req.files) {
                res.status(400).send('No files were uploaded.');
                return;
            }

            // TO-DO handle multiple files
            if (req.files.files instanceof Array) {
                res.status(400).send('Only one file can be uploaded at a time.');
                return;
            }

            // get the IP address of the client
            // the IP may cvome from cloudflare
            let ip = req.headers['cf-connecting-ip']?.toString() || req.headers['x-forwarded-for']?.toString() || req.ip || 'unknown';

            // remove the ::ffff: from the IP address
            ip = ip.replace('::ffff:', '');

            // if it is ipv6 remove invlaid characters for file names
            if (ip.includes(':')) {
                ip = ip.replace(/[^a-zA-Z0-9-_\.]/g, '');
            }

            // create a folder for the IP address
            const ipFolder = `${Config.fileServer.uploadDir}/${ip}`;
            if (!fs.existsSync(ipFolder)) {
                fs.mkdirSync(ipFolder);
            }

            // get the file
            const file = req.files.files;

            // get the file name
            let fileName = file.name;

            // check if the file already exists
            if (fs.existsSync(`${ipFolder}/${fileName}`)) {
                // if it does, add a number to the end of the file name
                let i = 1;
                while (fs.existsSync(`${ipFolder}/${fileName}`)) {
                    fileName = `${i}-${file.name}`;
                    i++;
                }
            }

            console.log(`Received file "${fileName}" from ${ip}.`);

            // save the file
            file.mv(`${ipFolder}/${fileName}`, function (err) {
                if (err) {
                    res.status(500).send(err);
                    return;
                }

                res.send('File uploaded!');
            });
        });

    }



    public serveFile(route: string, filePath: string) {
        // replace "\\ and \\" with "/"
        filePath = filePath.replace(/\\/g, '/');
        let fileName = filePath.split('/').pop();

        console.log(`[File] Serving file "${fileName}" at route "${route}".`);

        if (fileName) {
            // remove characters that are not allowed in a header
            fileName = fileName.replace(/[^a-zA-Z0-9-_\.]/g, '');

            const fileExtension = fileName.split('.').pop();
            const contentType = mime.lookup(fileExtension);

            this.app.get(`${route}`, (req, res) => {
                // checks if the file exists
                if (fs.existsSync(filePath)) {
                    res.set('Content-disposition', `${Config.fileServer.contentDisposition}; filename=${fileName}`);
                    res.set('Content-type', contentType ? contentType : 'application/octet-stream');
                    res.sendFile(filePath);
                    this.emit('serve', { route, filePath, req });
                } else {
                    res.status(404).send('Not found.');
                    this.emit('notFound', { route, filePath, req });
                }
            });
        }
    }

    public removeRoute(route: string) {
        this.app._router.stack.forEach((middleware, index, stack) => {
            if (middleware.route && middleware.route.path === route) {
                stack.splice(index, 1);
            }
        });

        this.app.get(route, (req, res) => {
            this.emit('requestFail', { route });
            res.status(410).send('Gone.');
        });

        console.log(`[File] Removed route "${route}".`);
    }


    public on(name, listener) {
        if (!this._events[name]) {
            this._events[name] = [];
        }

        this._events[name].push(listener);
    }

    public removeListener(name, listenerToRemove) {
        if (!this._events[name]) {
            throw new Error(`Can't remove a listener. Event "${name}" doesn't exits.`);
        }

        const filterListeners = (listener) => listener !== listenerToRemove;

        this._events[name] = this._events[name].filter(filterListeners);
    }

    private emit(name, data) {
        if (!this._events[name]) {
            return;
        }

        const fireCallbacks = (callback) => {
            callback(data);
        };

        this._events[name].forEach(fireCallbacks);
    }
}