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

///////////////////////////////////////////////////
//
//  POE application REST endpoints
//
///////////////////////////////////////////////////
// Add support for the Application specific REST calls
// addDoc, listDoc, transferDoc, verifyDoc, and delDoc

'use strict';

const express = require('express');
const router = express.Router();
const sdkInterface = require('./sdkInterface.js');
const init = require('./initialize.js');
const debug = require('debug')('poe');

const poeChaincode = init.poeChaincode;

// setup the sdk interface
const sdkInvoke = sdkInterface.sdkInvoke;
const sdkQuery = sdkInterface.sdkQuery;

// addDoc  Add a new document to the block chain
router.post('/addDoc', function(req, res) {
    const appUser = req.session.appUser;
    debug(appUser);

    debug('/addDoc request body %j', req.body);
    const params = req.body;
    const hash = req.body.hash;

    let hashValid = true;
    if (!hash) {
        hashValid = false;
        console.log('no hash provided');
    } else if (hash.length != 64) {
        hashValid = false;
    }

    if (hashValid === false) {
        console.log('The hash is invalid.');
        return res.status(500).send('Error: invalid hash');
    }

    debug('hash equals %s', hash);
    params.owner = appUser;

    const invokeRequest = {
        chaincodeID: poeChaincode.id,
        fcn: 'addDoc',
        args: [hash, JSON.stringify(params)],
    };
    debug('The invoke args = ', invokeRequest.args);

    sdkInvoke(appUser, invokeRequest)
        .then(function(results) {
            console.log('The completion results for /addDoc %j', results);
            if (results instanceof Error) {
                res.status(500).send(results.msg);
            }
            res.json(results);
        }, function(err) {
            // Invoke transaction submission failed
            let msg = 'Invoke failed for addDoc: ' + handleError(err);
            console.log(msg);
            debug(err);
            res.status(500).send(msg);
        });
});

router.get('/verifyDoc/:hash', function(req, res) {
    debug('received /verifyDoc with hash = %s', req.params.hash);
    // const appUser = GlobalAppUser[req.session.appUser];
    const appUser = req.session.appUser;

    const queryRequest = {
        chaincodeID: poeChaincode.id,
        fcn: 'readDoc',
        args: [req.params.hash]
    };

    sdkQuery(appUser, queryRequest)
        .then(function(results) {
            debug('successfully queried an existing document: ');
            if (results.length !== 0) {
                const params = JSON.parse(results);
                res.json(params);
            } else {
                res.status(500).send('Document not found');
            }
        }, function(err) {
            let msg = '/verifyDoc query failed: ' + handleError(err);
            console.log(msg);
            res.status(500).send(msg);
        });
});

// list document
// returns a list of all of the documents
router.get('/listDoc', function(req, res) {
    debug('received /listDoc');
    const appUser = req.session.appUser;

    const queryRequest = {
        chaincodeID: poeChaincode.id,
        fcn: 'listDoc',
        args: []
    };

    sdkQuery(appUser, queryRequest)
        .then(function(results) {
            debug('successfully queried for the document list.');
            debug(results);
            if (results.length !== 0) {
                const list = JSON.parse(results);
                debug(list);
                res.json(list);
            } else {
                res.status(500).send('Document list invalid');
            }
        }, function(err) {
            let msg = '/listDoc query failed: ' + handleError(err);
            console.log(msg);
            res.status(500).send(msg);
        });
});

// delDoc  Delete a document from the block chain
router.post('/delDoc', function(req, res) {
    debug('/delDoc request body %j', req.body);
    const appUser = req.session.appUser;

    debug('hash equals %s', req.body.hash);
    const hash = req.body.hash;

    const invokeRequest = {
        chaincodeID: poeChaincode.id,
        fcn: 'delDoc',
        args: [hash],
    };
    debug('The invoke args = ', invokeRequest.args);

    sdkInvoke(appUser, invokeRequest)
        .then(function(results) {
            console.log('The completion results for /delDoc %j', results);
            res.json(results);
        }, function(err) {
            // Invoke transaction submission failed
            let msg = 'Invoke failed for delDoc: ' + handleError(err);
            console.log(msg);
            res.status(500).send(msg);
        });
});

// editDoc  changes the owner of the doc but may be enhanced to include other parameters
router.post('/editDoc', function(req, res) {
    debug('/editDoc request body %j', req.body);
    const appUser = req.session.appUser;

    const invokeRequest = {
        chaincodeID: poeChaincode.id,
        fcn: 'transferDoc',
        args: [req.body.hash, req.body.owner],
    };
    debug('The invoke args = ', invokeRequest.args);

    sdkInvoke(appUser, invokeRequest)
        .then(function(results) {
            console.log('The completion results for /transferDoc %j', results);
            res.json(results);
        }, function(err) {
            // Invoke transaction submission failed
            debug('POE transferDoc invoke failed.');
            debug(err);
            let msg = 'Invoke failed for transferDoc: ' + handleError(err);
            console.log(msg);
            res.status(500).send(msg);
        });
});

function handleError(err) {
    let msg = 'unknown error';
    if (!err) {
        msg = 'error undefined';
    } else if (err.msg) {
        msg = err.msg;
    } else if (err.context) {
        debug(err.context);
        msg = err.context.msg;
    } else if (err.message) {
        msg = err.message;
    }
    return msg;
}

module.exports = router;
