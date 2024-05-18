const express = require('express'); // Import express
const crypto = require('crypto'); // Import crypto module
const fs = require('fs'); // Import fs module
const path = require('path'); // Import path module

var serverApp = express();



// Directory to store user data files (a nossa base de dados)
const DATA_DIR = path.join(__dirname, 'DB-data'); // data directory path
if (!fs.existsSync(DATA_DIR)) { // Create data directory if it doesn't exist
    fs.mkdirSync(DATA_DIR); // Synchronously create directory
}

// Function to generate MD5 hash from string
function generateMD5Hash(input) {
    return crypto.createHash('md5').update(input).digest('hex');
}


const winston = require('winston'); // Import winston module

const logger = winston.createLogger({ // Create a logger instance
    level: 'info', // Set log level to info
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    defaultMeta: { service: 'user-service' }, // Default metadata
    transports: [ // Define transports to log
        new winston.transports.File({ filename: 'error.log', level: 'error' }), // Log errors to error.log
        new winston.transports.File({ filename: 'combined.log' }), // Log all logs to combined.log
        new winston.transports.File({ filename: 'info.log', level: 'info' }),
        new winston.transports.File({ filename: 'trace.log', level: 'debug' }) // Using debug level for trace logs
    ]
});

// Function to log election process
function logElectionProcess(details) {
    logger.debug(details); // Log detailed trace information
}

// Logging an example
logger.info('Info level log'); // Log an info level message //.info faz com que em combined.log apareça em "level": "info"
logger.error('Error level log'); // Log an error level message //.error faz com que em combined.log apareça em "level": "error"

// Setup each instance with specific configurations
function setupServer(port) {
    serverApp.use(express.json());
    let userId;
    let userData;
    let filename;
    let filepath;

    // Add your routes and middleware to serverApp
    // POST route to create a new user or update existing user data
    serverApp.post('/db/c', (req, res) => {
        userId = req.body.userId;
        userData = req.body.userData;
        filename = generateMD5Hash(userId) + '.json'; // Generate filename from userId
        filepath = path.join(DATA_DIR, filename);

        fs.writeFile(filepath, JSON.stringify(userData), { flag: 'w' }, err => {
            if (err) {
                return res.status(500).json({ error: 'Error writing user data' });
            }
            res.status(200).json({ message: 'User data saved successfully' }); // Send success response
        });
    });

    // GET route to read user data
    serverApp.get('/db/r', (req, res) => {
            userId = req.query.userId;
            filename = generateMD5Hash(userId) + '.json';
            filepath = path.join(DATA_DIR, filename);

            fs.readFile(filepath, (err, data) => {
                if (err) {
                    return res.status(404).json({ error: 'User not found' });
                }
                res.status(200).json(JSON.parse(data));
            });
    });

    // Additional routes (update, delete) should be implemented similarly
    // POST route to update existing user data
    serverApp.post('/db/u', (req, res) => {
            userId = req.body.userId;
            userData = req.body.userData;
            filename = generateMD5Hash(userId) + '.json';
            filepath = path.join(DATA_DIR, filename);

            // Check if the file exists to update
            fs.exists(filepath, (exists) => {
                if (!exists) {
                    return res.status(404).json({ error: 'User not found' });
                }

                // Read current data, update it, and write back
                fs.readFile(filepath, (err, data) => {
                    if (err) {
                        return res.status(500).json({ error: 'Error reading user data' });
                    }
                    let currentData = JSON.parse(data);
                    let updatedData = { ...currentData, ...userData };
                    fs.writeFile(filepath, JSON.stringify(updatedData), { flag: 'w' }, err => {
                        if (err) {
                            return res.status(500).json({ error: 'Error writing user data' });
                        }
                        res.status(200).json({ message: 'User data updated successfully' });
                    });
                });
            });
    });

    // GET route to delete user data
    serverApp.get('/db/d', (req, res) => {
            userId = req.query.userId;
            filename = generateMD5Hash(userId) + '.json';
            filepath = path.join(DATA_DIR, filename);

            // Delete the file representing the user data
            fs.unlink(filepath, (err) => {
                if (err) {
                    return res.status(404).json({ error: 'User not found' });
                }
                res.status(200).json({ message: 'User data deleted successfully' });
            });
    });

    // Route for setting the master DN //DN = Data Node (Node that stores data)
    serverApp.get('/set_master', (req, res) => {
        let masterId = req.query.masterId;
        let dnId = req.query.dnId;

        if (!masterId || !dnId) {
            return res.status(400).json({ error: 'Missing masterId or dnId' });
        }

        logger.info(`New master for DN ${dnId}: ${masterId}`);
        // Optionally update any configuration or notify other components
        res.status(200).json({ message: `New master for DN ${dnId}: ${masterId}` });
    });

    // GET route for election
    serverApp.get('/election', (req, res) => {
        // This should involve some logic to participate in the election
        // For example, determining if this node should become the master
        conductElection(req.query.myNodeId).then(() => {
            res.status(200).send('Participated in election');
        }).catch(error => {
            logger.error('Election error', error);
            res.status(500).send('Election error');
        });
    });


    // Start the server

    serverApp.listen(port, () => {
        logger.info(`Server running on port ${port}`);
        console.log(`Server running on port ${port}`); //For immediate console feedback
    });
}

// Define ports for your nodes
const ports = [3000, 3001, 3002, 3003];
ports.forEach(port => {
    setupServer(port);
});



const HASH_MODULO = 3;  // Assuming three data nodes

function getShardId(key) {
    const hash = generateMD5Hash(key);
    return parseInt(hash, 16) % HASH_MODULO;
}

const axios = require('axios');
const NODES = [
    { id: 1, url: 'http://localhost:3001' },
    { id: 2, url: 'http://localhost:3002' },
    { id: 3, url: 'http://localhost:3003' }
]; // List of all nodes


// Function to conduct election: myNodeId is the ID of the node that initiates the election
// This function sends election requests to higher nodes and becomes the master if no active node is found
//Se esta função elegir um nó como master, esse nó será obrigatoriamente o nó myNodeId, ou seja, o nó que iniciou a eleição.
async function conductElection(myNodeId) {
    const promises = NODES.filter(node => node.id > myNodeId)
        .map(node => axios.get(`${node.url}/election`).catch(err => null)); // Send election request to higher nodes

    const results = await Promise.all(promises); // Wait for all responses
    const stillActive = results.some(result => result && result.status === 200); // Check if any node is still active, i.e., has not become the master

    if (!stillActive) // If no active node is found (all nodes have become master), elect this node as master
    {

        NODES.forEach(node => {
            if (node.id !== myNodeId)  //Se o nó não for o meu
            {
                axios.get(`${node.url}/set_master?masterId=${myNodeId}`);
            }
        });
        logElectionProcess(`Node ${myNodeId} is elected as master`);
    }
}


function notifyReverseProxy(masterId) {
    const rpUrl = 'http://localhost:3000/set_master'; // URL of the reverse proxy
    axios.get(rpUrl, { params: { masterId: masterId, dnId: NODE_ID } })
        .then(response => logger.info('Reverse proxy notified'))
        .catch(error => logger.error('Failed to notify reverse proxy', error));
}

//module.exports = myserver;