/*
Copyright 2019 BlocLedger

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

'use strict';

process.env.NODE_ENV = 'production';
process.env.UV_THREADPOOL_SIZE = 64;

const app = require('express')();
const morgan = require('morgan');
const bodyparser = require('body-parser');
const debug = require('debug')('poe');
const init = require('./initialize.js');
const poeRouter = require('./poeRouter.js'); // POE middleware to handle all of the POE REST endpoints
const sha = require('js-sha256');
const Client = require('fabric-client');
const FabricCAServices = require('fabric-ca-client');
const { FileSystemWallet, Gateway, X509WalletMixin } = require('fabric-network');

const PwStr = 'Pw!';

app.set('port', (process.env.PORT || 3000));

const discoverAsLocal = process.env.DISCOVER_MODE === 'asLocalhost';

// Store the exports from initialize.js in global variables
const GlobalAppUser = init.GlobalAppUser;

app.use(morgan('dev'));
app.use(require('express').static(__dirname + '/public'));
app.use(require('cookie-parser')());
app.use(bodyparser.json());
app.use(require('cookie-session')({
    name: 'session',
    keys: ['A cookie secret'],
    maxAge: 24 * 60 * 60 * 1000,
}));
bodyparser.urlencoded({ extended: true });

app.use('/', poeRouter);  // handle the POE REST endpoint routes

app.get('/', function(req, res) {
    debug('Display basic home page.');
    res.sendfile('./public/' + 'index.html');
});

app.get('/chaincode', function(req, res) {
    res.json(init.poeChaincode.id);
});

app.post('/chaincode', function(req, res) {
    let poeChaincode = req.body;
    let msg = 'chaincode update failed';
    let statusCode = 500;
    if (poeChaincode.chaincodeId && poeChaincode.chaincodeVersion) {
        init.setPoeChaincode(poeChaincode);
        msg = 'chaincode update succeeded';
        statusCode = 200;
    }
    return res.status(statusCode).send(msg);
});

function bufferToHex(dataObject, encoding = 'hex') {
    //  Change all of the Buffer objects into hex strings
    for (let prop in dataObject) {
        if (dataObject.hasOwnProperty(prop)) {
            if (dataObject[prop] instanceof Buffer) {
                dataObject[prop] = dataObject[prop].toString(encoding);
            } else if (Array.isArray(dataObject[prop])) {
                bufferToHexArray(dataObject[prop], encoding);
            } else if (dataObject[prop] instanceof Object) {
                bufferToHex(dataObject[prop], encoding);
            }
        }
    }
}

function bufferToHexArray(array, encoding = 'hex') {
    if (Array.isArray(array)) {
        for (let i = 0; i < array.length; i++) {
            const element = array[i];
            if (Array.isArray(element)) {
                bufferToHexArray(element, encoding);
            } else if (element instanceof Buffer) {
                array[i] = element.toString(encoding);
            } else if (element instanceof Object) {
                bufferToHex(element, encoding);
            }
        }
    }
}

app.get('/chain/transactions/:id', async function(req, res) {
    console.log('Get a transaction by ID: ' + req.params.id);

    let gateway;
    try {
        const wallet = new FileSystemWallet(init.walletDirectoryPath);
        const gatewayOptions = {
            identity: req.session.appUser,
            wallet,
            discovery: {
                enabled: true,
                asLocalhost: discoverAsLocal
            }
        };
        gateway = new Gateway();
        await gateway.connect(init.connectionProfile, gatewayOptions);
        const network = await gateway.getNetwork(init.channelName);
        const channel = network.getChannel();

        // Submit transaction query
        const result = await channel.queryTransaction(req.params.id);

        bufferToHex(result);

        debug(result);
        gateway.disconnect();
        res.json(result);
    } catch (err) {
        console.log(err);
        if (gateway) {
            gateway.disconnect();
        }
        res.status(500).send(err.msg);
    }
});

app.get('/activeUser', function(req, res) {
    console.log('active user: ' + req.session.appUser);
    if (req.session.appUser) {
        return res.send('Log out ' + req.session.appUser.split('@')[0]);
    }
    res.send('Click to log in');
});

app.put('/resetUser', function(req, res) {
    res.send('Click to log in');
});

app.get('/adminPriv', function(req, res) {
    let adminSet = true;
    let anAdmin = false;
    if (GlobalAppUser) {
        Object.keys(GlobalAppUser).forEach((userName) => {
            let usr = GlobalAppUser[userName];
            if (usr.userType == 'admin') {
                anAdmin = true;
            }
        });
    }
    if (req.session.appUser && anAdmin) {
        adminSet = GlobalAppUser[req.session.appUser].userType === 'admin';
    }
    if (!req.session.appUser && anAdmin) {
        adminSet = false;
    }
    const adminObj = { 'adminPriv': adminSet };
    res.json(adminObj);
});

app.get('/loggedIn', function(req, res) {
    let loggedIn = false;
    if (req.session.appUser) {
        loggedIn = true;
    }
    const loginObj = { 'loggedIn': loggedIn };
    res.json(loginObj);
});

app.get('/login', function(req, res) {
    console.log('Login/out: ' + req.user);
    if (req.user) {
        req.logout();
    }
    if (req.session.appUser) {
        req.session.appUser = null;
    }
    if (req.session.rememberUserName && !GlobalAppUser[req.session.rememberUserName]) {
        req.session.rememberUserName = null;
    }
    const userName = { 'userName': req.session.rememberUserName };
    res.json(userName);
});

app.post('/login', function(req, res) {
    const params = req.body;
    const userName = params.userName.toLowerCase();
    const pwHash = sha.sha256(PwStr + userName + params.userPw);
    let retVal = true;

    console.log('Login post: ' + userName);

    const appUser = GlobalAppUser[userName];
    if (appUser) {
        console.log('app user:'); console.log(appUser);
        if (pwHash !== appUser.pwHash) {
            retVal = false;
        } else {
            if (params.remember) {
                console.log('remember ' + appUser.userName);
                req.session.rememberUserName = appUser.userName;
            }
            console.log('Set appUser: ' + appUser.userName);
            req.session.appUser = appUser.userName;
            res.redirect('/');
            return;
        }
    } else {
        retVal = false;
    }

    if (!retVal) {
        res.status(500).send('Login failed');
        return false;
    }
    res.status(200).send('success');
    return true;
});

async function writeUsers() {
    const users = [];
    let appUserStr;
    try {
        let store = await Client.newDefaultKeyValueStore({path: init.kvsPath});
        Object.keys(GlobalAppUser).forEach(function(userName) {
            const usr = GlobalAppUser[userName];
            const newUsr = {
                userName: usr.userName, pwHash: usr.pwHash,
                userType: usr.userType
            };
            users.push(newUsr);
        });
        appUserStr = JSON.stringify(users) + '\n';

        store.setValue('appUsers', appUserStr);
    } catch (e) {
        console.log('Error saving user: ' + e);
    }
}

app.post('/addUser', async function(req, res) {
    const params = req.body;
    let appUser = null;
    const userName = params.userName.toLowerCase();

    console.log('Add user post: ' + userName);
    appUser = GlobalAppUser[userName];
    if (appUser) {
        res.status(500).send('User name is already in use');
        return;
    }

    if (!params.userPw) {
        res.status(500).send('Missing password');
        return;
    }
    if (params.userPw != params.userPwRepeat) {
        res.status(500).send('Passwords do not match');
        return;
    }
    const pwHash = sha.sha256(PwStr + userName + params.userPw);
    let userType = params.userType;
    if (userType === undefined || !userType) {
        userType = 'user';
    }

    let gateway;
    try {
        let client;
        let ca;
        let registrar;

        const wallet = new FileSystemWallet(init.walletDirectoryPath);

        const adminReady = await wallet.exists('admin');
        if (!adminReady) {
            const caKeys = Object.keys(init.connectionProfile.certificateAuthorities);
            const caUrl = init.connectionProfile.certificateAuthorities[caKeys[0]].url;
            ca = new FabricCAServices(caUrl);
            let registrarId = params.registrarId;
            let registrarPw = params.registrarPw;
            if (!registrarId || !registrarPw) {
                const registrars = ca.getRegistrar();
                if (!(registrars && Array.isArray(registrars) && registrars.length > 0)) {
                    throw new Error('Registrar not available');
                }
                registrarId = registrars[0].enrollId;
                registrarPw = registrars[0].enrollSecret;
            }
            const enrollment = await ca.enroll({ enrollmentID: registrarId, enrollmentSecret: registrarPw });
            client = Client.loadFromConfig(init.connectionProfile);
            const mspID = client.getMspid();
            const cert = enrollment.certificate;
            const key = enrollment.key.toBytes();

            const identity = X509WalletMixin.createIdentity(mspID, cert, key);

            await wallet.import('admin', identity);
        }

        const gatewayOptions = {
            identity: 'admin',
            wallet,
            discovery: {
                enabled: true,
                asLocalhost: discoverAsLocal
            }
        };
        gateway = new Gateway();
        await gateway.connect(init.connectionProfile, gatewayOptions);

        client = gateway.getClient();
        ca = client.getCertificateAuthority();
        registrar = gateway.getCurrentIdentity();

        const registrationRequest = {
            enrollmentID: userName,
            enrollmentSecret: params.userPw,
            maxEnrollments: 0,
            role: 'client'
        };
        await ca.register(registrationRequest, registrar);
        const enrollmentRequest = {
            enrollmentID: userName,
            enrollmentSecret: params.userPw
        };
        const enrollment = await ca.enroll(enrollmentRequest);
        debug(enrollment);

        const mspID = client.getMspid();
        const cert = enrollment.certificate;
        const key = enrollment.key.toBytes();

        const identity = X509WalletMixin.createIdentity(mspID, cert, key);

        await wallet.import(userName, identity);

        gateway.disconnect();

    } catch (err) {
        console.log(err);
        if (gateway) {
            gateway.disconnect();
        }
        return res.status(500).send(err.message);
    }

    const user = { userName: userName, pwHash: pwHash, userType: userType };
    GlobalAppUser[userName] = user;
    writeUsers();

    res.status(200).send('User added');
    return;
});

app.post('/editUser', function(req, res) {
    const params = req.body;
    let appUser = null;
    const userName = params.userName.toLowerCase();

    console.log('Edit user post: ' + userName);
    appUser = GlobalAppUser[userName];
    if (!appUser) {
        res.status(500).send('User name not found');
        return;
    }

    if (params.userPw) {
        if (params.userPw != params.userPwRepeat) {
            res.status(500).send('Passwords do not match');
            return;
        }
        const pwHash = sha.sha256(PwStr + userName + params.userPw);
        appUser.pwHash = pwHash;
    }
    const userType = params.userType;
    if (userType) {
        appUser.userType = userType;
    }

    writeUsers();

    res.status(200).send('User edited');
    return;
});

app.post('/delUser', function(req, res) {
    const params = req.body;
    const userName = params.delUserName.toLowerCase();

    console.log('Delete user post: ' + userName);

    const appUser = GlobalAppUser[userName];
    if (appUser) {
        delete GlobalAppUser[userName];

        if (userName == req.session.appUser) {
            if (req.user) {
                req.logout();
            }
            req.session.appUser = null;
        }
        if (userName == req.session.rememberUserName) {
            req.session.rememberUserName = null;
        }
    } else {
        return res.status(500).send('User name not found');
    }

    writeUsers()
        .then(function() {
            if (!req.session.appUser) {
                console.log('Removed appUser');
                // Send status 201 to indicate that we removed the current logged-in user.
                // Tried using res.redirect() here, without success.
                res.status(201).send('success');
            }
            res.status(200).send('success');
        })
        .catch(function(err) {
            console.log(err);
        });
});

// eslint-disable-next-line no-unused-vars
app.use(function(err, req, res, next) {
    console.log('unhandled error detected: ' + err.message + '\nurl: ' + req.url);
    res.type('text/plain');
    res.status(500);
    res.send('500 - server error');
});

app.use(function(req, res) {
    console.log('route not handled: ' + req.url);
    res.type('text/plain');
    res.status(404);
    res.send('404 - not found');
});

app.listen(app.get('port'), function() {
    console.log('listening on port', app.get('port'));
});
