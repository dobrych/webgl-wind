const PNG = require('pngjs').PNG;
const fs = require('fs');
const request = require('request');
const d3Array = require('d3-array');

// source of timestamps
// https://api.planetos.com/v1/datasets/noaa_gfs_global_sflux_0.12d/variables/v-component_of_wind_height_above_ground/timestamps?apikey=<apikey>

const HOUR_STEP = 6;
const API_BASE_URL = 'https://api.planetos.com/v1/datasets/noaa_gfs_global_sflux_0.12d';
const apiKey = process.argv[2];


// promise-based variable fetching
function fetch_variable(var_name, timestamp) {
    return new Promise(function (resolve, reject) {
        request(`${API_BASE_URL}/variables/${var_name}/preview?timestamp=${timestamp}&apikey=${apiKey}`, function(error, response, body) {
            if (!error && response.statusCode === 200)
                resolve(JSON.parse(body));
            else
                reject(`${response.statusCode} ${error}: ${body}`);
        });
    })
};

function formatTs(ts) {
    return (new Date(ts)).toISOString();
};

// main PNG rendering process
function renderTimestamp(ts) {
    const timestamp = formatTs(ts);

    const name = timestamp;
    let u = {};
    let v = {};

    let width = 0;
    let height = 0;
    let png;


    fetch_variable('v-component_of_wind_height_above_ground', ts)
        .then(function (content_v) {
            v = content_v;
            width = content_v.lon.length;
            height = content_v.lat.length;
            v.maximum = d3Array.max(content_v.values, function(ar) { return d3Array.max(ar); });
            v.minimum = d3Array.min(content_v.values, function(ar) { return d3Array.min(ar); });

            png = new PNG({
                colorType: 2,
                filterType: 4,
                width: width,
                height: height
            });

            fetch_variable('u-component_of_wind_height_above_ground', ts)
                .then(function(content_u) {
                    u = content_u;
                    u.maximum = d3Array.max(content_u.values, function(ar) { return d3Array.max(ar); });
                    u.minimum = d3Array.min(content_u.values, function(ar) { return d3Array.min(ar); });
                    
                    console.log('Processing snapshot: ', timestamp);

                    // console.log('generatePNG: ', 'height ', height, ', width ', width);

                    for (let y = 0; y < height; y++) {
                        // console.log("processing row: ", y, ' out of ', height);
                        for (let x = 0; x < width; x++) {
                            const i = (y * width + x) * 4;
                            // const k = y * width + (x + width / 2) % width;
                            png.data[i + 0] = Math.floor(255 * (u.values[y][x] - u.minimum) / (u.maximum - u.minimum));
                            png.data[i + 1] = Math.floor(255 * (v.values[y][x] - v.minimum) / (v.maximum - v.minimum));
                            png.data[i + 2] = 0;
                            png.data[i + 3] = 255;
                        }
                    }

                    png.pack().pipe(fs.createWriteStream(name + '.png'));

                    fs.writeFileSync(name + '.json', JSON.stringify({
                        source: 'http://data.planetos.com',
                        date: timestamp,
                        width: width,
                        height: height,
                        uMin: u.minimum,
                        uMax: u.maximum,
                        vMin: v.minimum,
                        vMax: v.maximum
                    }, null, 2) + '\n');
                })
                .catch(function (err) { console.log('err:', err); })
        })
        .catch(function (err) { console.log('err:', err); })
};

request(`${API_BASE_URL}/variables/v-component_of_wind_height_above_ground/timestamps?apikey=${apiKey}`, function(error, response, body) {
    if (!error && response.statusCode === 200) {
        // limit timestamps to 3 days
        const timestamps = JSON.parse(body);
        const timestampsToRender = [];
        const r = {};
        // fill in every "HOUR_STEP"
        timestamps.forEach(function(ts, i) {
            if ((i % HOUR_STEP) === 0) {
                r[i] = formatTs(ts);
                timestampsToRender.push(ts);
            }
        });
        console.log('Move *.json and *.png files to demo/wind folder and add update `const windFiles` object inside demo/index.js with the fresh content:')
        console.log('const windFiles =', JSON.stringify(r, null, 4).replace(/\"(\d+)\"\:/g,"$1:"),';');

        timestampsToRender.forEach(function(ts, i) {
            setTimeout(function() {
                renderTimestamp(ts);
            }, 2000*i);
        });
    } else {
        console.log('Failed fetching timestamps', error, response.statusCode, body);
    }
});