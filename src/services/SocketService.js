import ApiService from '../services/ApiService';
import AuthorizedApp from '../models/AuthorizedApp';
import {store} from '../store/store';
import * as Actions from '../store/constants';
const http = window.require('http');
const https = window.require('https');

import {Popup} from '../models/popups/Popup'
import PopupService from '../services/PopupService';

let io = window.require('socket.io')();

let rekeyPromise;
const getNewKey = socket => new Promise((resolve, reject) => {
    rekeyPromise = {resolve, reject};
    socket.emit('rekey');
});

const socketHandler = (socket) => {

    // const testers = [
    //     'connect_error',
    //     'connect_timeout',
    //     'error',
    //     'disconnect',
    //     'reconnect',
    //     'reconnect_attempt',
    //     'reconnecting',
    //     'reconnect_error',
    //     'reconnect_failed',
    //     'ping',
    //     'pong',
    // ];
    //
    // testers.map(x => {
    //     socket.on(x, e => console.error(x, e))
    // });


    // TODO: Testing the event system.
    // Events are sent to the applications to notify them of changes
    // such as identity changes, key removals, account un-linking
    // and scatter being locked.
    // setInterval(() => {
    //     if(authenticated)
    //         socket.emit('event', 'evented');
    // }, 2000);


    // When something connects we automatically
    // notify it of a successful connection
    socket.emit('connected');

    // All authenticated api requests pass through the 'api' route.
    socket.on('api', async request => {

        // 2 way authentication
        if(request.data.hasOwnProperty('appkey')){
            const existingApp = store.state.scatter.keychain.findApp(request.data.payload.origin);

            const updateNonce = async () => {
                const clone = store.state.scatter.clone();
                existingApp.nextNonce = request.data.nextNonce;
                clone.keychain.updateOrPushApp(existingApp);
                return store.dispatch(Actions.SET_SCATTER, clone);
            };

            const removeAppPermissions = async () => {
                const clone = store.state.scatter.clone();
                clone.keychain.removeApp(existingApp);
                return store.dispatch(Actions.SET_SCATTER, clone);
            };


            if(!existingApp) return;
            if(!existingApp.checkKey(request.data.appkey)) return;
            if(existingApp.nextNonce.length && !existingApp.checkNonce(request.data.nonce)) await removeAppPermissions();
            else await updateNonce();
        }

        socket.emit('api', await ApiService.handler(Object.assign(request.data, {plugin:request.plugin})));
    });

    socket.on('rekeyed', async request => {
        rekeyPromise.resolve(request);
    });

    socket.on('pair', async request => {
        const scatter = store.state.scatter;
        const existingApp = scatter.keychain.findApp(request.data.origin);
        const linkApp = {
            type:'linkApp',
            payload:request.data
        };

        if(request.data.passthrough)
            return socket.emit('paired', existingApp && existingApp.checkKey(request.data.appkey));

        const addAuthorizedApp = (newKey = null) => {
            const authedApp = new AuthorizedApp(request.data.origin, newKey ? newKey : request.data.appkey);
            const clone = scatter.clone();
            clone.keychain.updateOrPushApp(authedApp);
            store.dispatch(Actions.SET_SCATTER, clone);
            socket.emit('paired', true);
        };

        const repair = async () => {
            const newKey = await getNewKey(socket);
            if(newKey.data.origin !== request.data.origin || newKey.data.appkey.indexOf('appkey:') === -1) return socket.emit('paired', false);
            addAuthorizedApp(newKey.data.appkey)
        }

        if(existingApp){
            if(existingApp.checkKey(request.data.appkey)) return socket.emit('paired', true);
            else PopupService.push(Popup.popout(linkApp, async ({result}) => {
                if(result) return repair();
                else socket.emit('paired', false);
            }));
        }
        else return repair();
    });
};

const getCerts = async () => {
    return fetch('https://certs.get-scatter.com')
        .then(res => res.json())
        .catch(() => console.error('Could not fetch certs. Probably due to a proxy, vpn, or firewall.'));
};


const ip = '127.0.0.1';
const isPortOpen = async port => new Promise(resolve => {
    const httpServer = http.createServer();
    httpServer.on('error', error => {
        resolve(false);
    })

    httpServer.listen(50005,ip);

    setTimeout(() => {
        httpServer.close();
        resolve(true);
    }, 400);
});

// Every 2 minutes.
const reconnectTime = 1000*60*2;
let initialConnection = true;

export default class SocketService {

    static async initialize(){

        const recurse = () => setTimeout(() => {
            this.initialize(true);
        }, reconnectTime); // every ten minutes.

        if(!(await isPortOpen(50005))) return recurse();

        const options = { pingTimeout:100000000000000000 };

        // HTTP protocol (port 50005)
        const httpServer = http.createServer();
        httpServer.listen(50005,ip);
        io.attach(httpServer,options);

        // HTTPS protocol (port 50006)
        const certs = await getCerts();
        if(certs && certs.hasOwnProperty('key') && certs.hasOwnProperty('cert')){
            const httpsServer = https.createServer(certs);
            httpsServer.listen(50006, ip);
            io.attach(httpsServer,options);
        } else {
            if(initialConnection) PopupService.push(Popup.prompt("Couldn't fetch certificates",
                'There was an issue trying to fetch the certificates which allow Scatter to run on SSL. This is usually caused by proxies, firewalls, and anti-viruses.',
                'exclamation-triangle', 'Okay'))
        }

	    initialConnection = false;
        this.open();
        recurse();
        return true;
    }

    static open(){
        const namespace = io.of(`/scatter`);
        namespace.on('connection', socket => socketHandler(socket))
    }

    static async close(){
        // Getting namespace
        if(!io) return;
        const socket = io.of(`/scatter`);

        // Disconnecting all active connections to this namespace
        Object.keys(socket.connected).map(socketId => {
            socket.connected[socketId].disconnect();
        });

        // Removing all event emitter listeners.
        socket.removeAllListeners();

        // Deleting the namespace from the array of
        // available namespaces for connections
        delete io.nsps[`/scatter`];

        return true;
    }

}
