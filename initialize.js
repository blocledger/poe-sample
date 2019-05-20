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

const Client = require('fabric-client');

const debug = require('debug')('poe');
const fs = require('fs');
const connectionProfile = require('./config/network/connection.json');  // load the connection profile

let GlobalAppUser = {};



// Configure the KeyValStore which is used to store sensitive keys
// check that the ./tmp directory existsSync
if (!fs.existsSync('./config')) {
    fs.mkdirSync('./config');
}
if (!fs.existsSync('./config')) {
    throw new Error('Could not create the ./config directory');
}

const kvsPath = './config/keyValStore';
let store;

const poeChaincodeKey = 'chaincodeID.poe';
let poeChaincode = {};
function setPoeChaincode(id) {
    poeChaincode.id = id;

    store.setValue(poeChaincodeKey, JSON.stringify(id))
        .then(function(value) {
            console.log('chaincode id stored', value);
        }, function(err) {
            console.log('error saving chaincode id. ' + err);
        });
}

// Initialize poeChaincode and GlobalAppUser
Client.newDefaultKeyValueStore({ path: kvsPath })
    .then(function(result) {
        store = result;
        return store.getValue(poeChaincodeKey);  // Get the shared POE chaincode ID
    })
    .then(function(value) {
        if (value) {
            debug('POE chaincode ID is ', value);
            try {
                poeChaincode.id = JSON.parse(value);
            } catch (e) {
                debug('error parsing poe chaincode id from file', e);
            }
        }

        return store.getValue('appUsers');
    })
    .then(function(value) {
        let users;

        if (value) {
            try {
                users = JSON.parse(value);
            } catch (e) {
                debug('Error in appUsers file');
                users = [];
            }
            users.forEach(function(appUser) {
                GlobalAppUser[appUser.userName] = appUser;
            });
        }
    })
    .catch(function(err) {
        debug('Failed getting chaincode ID', err);
    });

const walletDirectoryPath = './config/wallet';
exports.walletDirectoryPath = walletDirectoryPath;
const channelName = process.env.CHANNEL_NAME || 'mychannel';
exports.channelName = channelName;
exports.connectionProfile = connectionProfile;

exports.kvsPath = kvsPath;
exports.GlobalAppUser = GlobalAppUser;
exports.poeChaincode = poeChaincode;
exports.setPoeChaincode = setPoeChaincode;
