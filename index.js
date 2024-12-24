const express = require('express');
const fs = require('fs');
const shell = require('shelljs');
const cors=require('cors');
const app = express();
const port = 3000;

app.use(express.json());
app.use(cors());
app.post('/register', (req, res) => {
    const clientName = req.body.device_id;  // Using device_id from the request body

    if (!clientName) {
        return res.status(400).send({ error: 'Device ID is required' });
    }

    const configFileName = `wg0-client-${clientName}.conf`;
    const configPath = `/home/ubuntu/${configFileName}`;
    // Check if the configuration file for this client already exists
    fs.access(configPath, fs.constants.F_OK, (err) => {
        if (!err) {
            // File exists, client already registered, send back the existing config file
            fs.readFile(configPath, 'utf8', (err, data) => {
                if (err) {
                    console.error('Failed to read existing config file:', err);
                    return res.status(500).send({ error: 'Failed to retrieve existing client configuration', details: err.message });
                }
                return res.status(200).send({ message: 'Client already registered', client_config: data });
            });
        } else {
            // File does not exist, proceed with registration
            const command = `/root/wire.sh "${clientName}"`;

            shell.exec(command, {silent: true}, (code, stdout, stderr) => {
                if (code !== 0) {
                    console.error('Script failed:', stderr);
                    return res.status(500).send({ error: 'Failed to generate WireGuard configuration', details: stderr });
                }

                // Read the newly created configuration file
                fs.readFile(configPath, 'utf8', (err, data) => {
                    if (err) {
                        console.error('Failed to read config file:', err);
                        return res.status(500).send({ error: 'Failed to retrieve client configuration', details: err.message });
                    }
                    res.status(200).send({ message: 'Client registered successfully', client_config: data });
                });
            });
        }
    });
});

app.listen(port, '0.0.0.0', () => {
    console.log(`WireGuard API server running at http://0.0.0.0:${port}`);
});
