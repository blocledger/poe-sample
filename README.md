# Proof of Existence (POE) sample application
BlocLedger’s POE sample application utility provides authentication and verification of electronic
documents/files using Hyperledger Fabric blockchain. 

The utility provides a proof of existence for any digital representation of electronic files. 
Though simple in nature, the POE authentication utility is required for a multitude of common blockchain 
use cases. Some examples are: proof of educational and professional credentials; authentication of 
business or government contracts, agreements, licenses, titles, or registries; or track and trace of any 
document centric process such as supply chain. 

The POE sample application performs three basic functions: 
1.	Register a User: establishes blockchain Certificate Authority credentials 
2.	Add Document: Fabric chaincode stores a SHA-256 hash of the file on the ledger
3.	Verify:  query of the ledger to authenticate the existence of an electronic document/file

BlocLedger has developed a blockchain infrastructure API ideally suited for digital document centric 
solutions. Leveraging blockchain and BlocLedger’s technology, many use cases will benefit from the 
efficiency and immutable transparent trust of blockchain secured and managed document assets. 
BlocLedger’s software API can be used by clients to develop and implement specific document centric 
use cases or alternatively, the company can be contracted to develop custom solutions based on its API. 
For more information about BlocLedger and its technology, please contact Al Brandt (al.brandt@blocledger.com). 

# Running POE on a local Fabric using IBM Blockchain Platform Extension for VS Code

## Requirements

- VS Code version 1.32 or greater
- IBM Blockchain Platform Extension for VS Code version 1.0.1 or greater

Review and follow the requirements in the details section from the IBM Blockchain Platform Extension.

For example the requirements as of version 1.0.1 are:

> ## Requirements
>
> You will need the following installed in order to use the extension:
> - Windows 10, Linux, or Mac OS are currently the supported operating systems.
> - [VS Code version 1.32 or greater](https://code.visualstudio.com)
> - [Node v8.x or greater and npm v5.x or greater](https://nodejs.org/en/download/)
> - [Docker version v17.06.2-ce or greater](https://www.docker.com/get-docker)
> - [Docker Compose v1.14.0 or greater](https://docs.docker.com/compose/install/)
> - [Go version v1.12 or greater for developing Go contracts](https://golang.org/dl/)
>
> If you are using Windows, you must also ensure the following:
> - Docker for Windows is configured to use Linux containers (this is the default)
> - You have installed the C++ Build Tools for Windows from [windows-build-tools](https://github.com/felixrieseberg/windows-build-tools#windows-build-tools)
> - You have installed OpenSSL v1.0.2 from [Win32 OpenSSL](http://slproweb.com/products/Win32OpenSSL.html)
>   - Install the normal version, not the version marked as "light"
>   - Install the Win32 version into `C:\OpenSSL-Win32` on 32-bit systems
>   - Install the Win64 version into `C:\OpenSSL-Win64` on 64-bit systems

Additionally review the tutorial and documentation provided with IBM Blockchain Platform Extension.

## POE Installation
- Clone the POE sample into directory of your choosing   
`git clone https://github.com/blocledger/poe-sample.git`
- Change to the POE directory...   
`cd poe-sample/`
- Install the dependencies   
`npm install -g bower`   
`npm install`  
`bower install`  

## Package Chaincode
The POE chaincode needs to be packaged before it can be installed on a blockchain.
- Make sure that GOPATH is to the poe-sample/chaincode directory
- Open vscode in the poe-sample/chaincode/src/github.com/poe-chaincode-go/ directory
- From the command pallet choose "IBM Blockchain Platform: Package a Smart Contract Project" and follow the prompts
- When asked enter a chaincode name and version.  `poe-100` and `1.0.0` for example.

> Note: If you get an error similar to `cannot find package "github.com/hyperledger/fabric/core/chaincode/shim"` try disabling go extensions.

> Note: Many of the extension commands can be run from the VS Code Command pallet or by right clicking
  on elements of the left side menu.  In general these instructions will give the name used in the
  command pallet using the acronym IBP for IBM Blockchain Platform.

## Start local fabric
- Open a new VS Code instance in the poe-sample directory
- Run IBP: Start Fabric Runtime
- Wait for the local fabric network to be built

## Install chaincode
- Run IBP: Install Smart Contract.  Use the chaincode name created in the previous step.

## Instantiate chaincode
- Run IBP: Instantiate Smart Contract.
    - Select the default channel called mychannel
    - Use the same chaincode as before
    - When asked for a function just hit enter
    - Select 'No' for the private data configuration file

## Export the connection profile
- If present, delete any old connection profiles from the `poe-sample/config/network/` directory
- Run IBP: Export Connection Profile
- Using the pop-up window navigate into the poe-sample/config/network directory and 
rename the exported file to connection.json   
  `poe-sample/config/network/connection.json`

## Start the POE app
- In a terminal from the poe-sample directory enter the following command  
    `HFC_LOGGING='{"debug": "console"}' DEBUG=poe DISCOVER_MODE=asLocalhost node app.js`
- Open your browser to  `http://localhost:3000`

## Add a user
- On the start page click the 'Add User' button
- Fill in an email address.  It needs to be correctly formed but doesn't need to be valid
  For example `test1@org1.com`
- Use a password of your choosing
- Select 'Administrator' as the user type
- Fill in the CA Registrar and password.  For the local fabric built by the IBP extension  the values are `admin` and `adminpw`
- Click the 'Add user' button

## Login with your new user
- Click the link in the upper right corner to go to the login page
- Enter the user ID and password for your user

## Configure chaincode
- Click the 'Admin' link
- On the Admin page file out the chaincode name and version. Example `poe-100 and 1.0.0`
- Click 'Update'

## Add a document
- Click the 'Add Document' link on the left side or in the drop down menu
- Add a file to the drop box or use the 'Select file' button
- Once the file has been hashed click the blue 'Add Doc' button

## View document list
- Click the 'List Documents' link on the left side or in the drop down menu
- A list of the currently stored documents is display with button to edit and delete them

## Shutting down
- Go to the terminal window that node was started in and enter a ctrl-c to exit
- Delete everything under poe-sample/config/network, poe-sample/config/wallet, and poe-sample/config/keyValStore  
`rm -r config/network/*`  
`rm -r config/wallet/*`  
`rm -r config/keyValStore/*`  
- Back on VS Code run IBP: Teardown Fabric Runtime from the VS Code command palette

# Running POE on the IBM Blockchain Platform (SaaS) Version 2

These instructions describe how to run POE on the IBM Blockchain Platform Version 2
blockchain-as-a-service.
It is assumed that a Fabric network with at least one organization and one peer has been
built and is functional on the service.
If you are new to the service try using the
[IBM Blockchain Platform Version 2 tutorial](https://cloud.ibm.com/docs/services/blockchain/howto?topic=blockchain-ibp-console-build-network) as a guide.

> **Important:** Since the POE application uses the Service Discovery feature of Fabric, anchor
peers must be defined for channels with more than one organizations.
Review [Configuring anchor peers](https://cloud.ibm.com/docs/services/blockchain/howto?topic=blockchain-ibp-console-govern#ibp-console-govern-channels-anchor-peers)
in the 'Governing components' document for detailed steps.

## Export the POE chaincode
- From the VS Code command palette, choose Run IBP: Export package and Export the poe-100 package

## Install and Instantiate the POE chaincode
- On the IBM Blockchain Platform Version 2 user interface go to the 'Smart contracts' page
- Click the blue 'Install smart contract' button
- From the panel on the right, upload the CDS package exported from VS Code in the previous step
- Click the options icon at the end of the row for the new POE smart contract
- Select 'Instantiate'
- Follow the menu prompts.  Like before a function does not need to be specified

> Note: If you get a timeout error just wait a minute or two and click the 'Instantiate' button again
without changing any options


## Download the connection profile
- Go to the Smart contracts section
- Scroll down and find the POE chaincode in the Instantiated smart contracts list
- Click the options icon at the end of the POE chaincode row
- Select 'Connect with SDK'
- In the menu box on the right select the correct MSP and CA
- Click the blue 'Download connection profile' button
- Copy and rename the file to 'poe-sample/config/network/connection.json'

## Start the POE app
- In a terminal from the poe-sample directory enter the following command  
    `HFC_LOGGING='{"debug": "console"}' DEBUG=poe node app.js`
- If a channel name other than 'mychannel' is used then CHANNEL_NAME needs to be set  
    `HFC_LOGGING='{"debug": "console"}' DEBUG=poe CHANNEL_NAME=channel1 node app.js`

    > Note: This time do not include the DISCOVER_MODE environment variable

- Open your browser to `http://localhost:3000`

Follow the same steps as before to add a user and use the POE app.

> Note: If a different CA user was created instead of admin/adminpw as shown in the tutorial then
  when adding a user fill in the CA Registrar fields with the CA user that was created.
