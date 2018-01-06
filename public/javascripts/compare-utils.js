const https = require('https');
const fs = require('fs');
const path = require('path');

let get_https_data = function () {
    // const options = {
    //     hostname: 'encrypted.google.com',
    //     port: 443,
    //     path: '/',
    //     method: 'GET',
    //     // key: fs.readFileSync('test/fixtures/keys/agent2-key.pem'),
    //     // cert: fs.readFileSync('test/fixtures/keys/agent2-cert.pem')
    // };
    // options.agent = new https.Agent(options);

    const options = {
        hostname: '',
        port: 443,
        path: '/',
        method: 'GET'
    };

    const req = https.request(options, (res) => {
        console.log('statusCode:', res.statusCode);
        console.log('headers:', res.headers);

        res.on('data', (d) => {
            process.stdout.write(d);
        });
    });

    req.on('error', (e) => {
        console.error(e);
    });
    req.end();
};

/**
 * Process wrong json data to right json data.
 */
let process_data = function () {
    let file_path = path.resolve('../data/source_data.json');
    // console.info(file_path);
    let file_data = fs.readFileSync(file_path, 'utf-8');
    // console.info(file_data);
    let string_data = JSON.stringify(file_data);
    console.info(string_data);
    let process_string_data = string_data.replace(/]\[/g, ',');
    process_string_data = JSON.parse(process_string_data);
    console.info(process_string_data);
    fs.writeFileSync(path.resolve('../data/processed_data.json'), process_string_data);
};

get_https_data();

