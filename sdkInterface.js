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

const debug = require('debug')('poe');
const init = require('./initialize.js');
const { FileSystemWallet, Gateway } = require('fabric-network');

const discoverAsLocal = process.env.DISCOVER_MODE === 'asLocalhost';

async function sdkInvoke(user, invokeRequest) {
    const ccID = invokeRequest.chaincodeID;

    let gateway;
    try {
        const wallet = new FileSystemWallet(init.walletDirectoryPath);
        const gatewayOptions = {
            identity: user,
            wallet,
            discovery: {
                enabled: true,
                asLocalhost: discoverAsLocal
            }
        };
        gateway = new Gateway();
        await gateway.connect(init.connectionProfile, gatewayOptions);
        const network = await gateway.getNetwork(init.channelName);
        const contract = network.getContract(ccID.chaincodeId);

        // Submit transaction
        const result = await contract.submitTransaction(invokeRequest.fcn, ...invokeRequest.args);
        debug(result);
        gateway.disconnect();
        return Promise.resolve(result);
    } catch (err) {
        console.log(err);
        if (gateway) {
            gateway.disconnect();
        }
        return Promise.reject(err);
    }
}

async function sdkQuery(user, queryRequest) {
    const ccID = queryRequest.chaincodeID;

    let gateway;
    try {
        const wallet = new FileSystemWallet(init.walletDirectoryPath);
        const gatewayOptions = {
            identity: user,
            wallet,
            discovery: {
                enabled: true,
                asLocalhost: discoverAsLocal
            }
        };
        gateway = new Gateway();
        await gateway.connect(init.connectionProfile, gatewayOptions);
        const network = await gateway.getNetwork(init.channelName);
        const contract = network.getContract(ccID.chaincodeId);

        // Submit transaction
        const result = await contract.evaluateTransaction(queryRequest.fcn, ...queryRequest.args);
        debug(result);
        gateway.disconnect();
        return Promise.resolve(result);
    } catch (err) {
        console.log(err);
        if (gateway) {
            gateway.disconnect();
        }
        return Promise.reject(err);
    }
}

exports.sdkInvoke = sdkInvoke;
exports.sdkQuery = sdkQuery;
