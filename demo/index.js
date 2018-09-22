// using var to work around a WebKit bug
var canvas = document.getElementById('canvas'); // eslint-disable-line

const pxRatio = Math.max(Math.floor(window.devicePixelRatio) || 1, 2);
canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;

const gl = canvas.getContext('webgl', {antialiasing: false});

const wind = window.wind = new WindGL(gl);
wind.numParticles = 65536;

function frame() {
    if (wind.windData) {
        wind.draw();
    }
    requestAnimationFrame(frame);
}
frame();

const gui = new dat.GUI();
gui.add(wind, 'numParticles', 1024, 589824);
gui.add(wind, 'fadeOpacity', 0.96, 0.999).step(0.001).updateDisplay();
gui.add(wind, 'speedFactor', 0.05, 1.0);
gui.add(wind, 'dropRate', 0, 0.1);
gui.add(wind, 'dropRateBump', 0, 0.2);

const windFiles = {
    0: "2018-09-20T06:00:00.000Z",
    6: "2018-09-20T12:00:00.000Z",
    12: "2018-09-20T18:00:00.000Z",
    18: "2018-09-21T00:00:00.000Z",
    24: "2018-09-21T06:00:00.000Z",
    30: "2018-09-21T12:00:00.000Z",
    36: "2018-09-21T18:00:00.000Z",
    42: "2018-09-22T00:00:00.000Z",
    48: "2018-09-22T06:00:00.000Z",
    54: "2018-09-22T12:00:00.000Z",
    60: "2018-09-22T18:00:00.000Z",
    66: "2018-09-23T00:00:00.000Z",
    72: "2018-09-23T06:00:00.000Z",
    78: "2018-09-23T12:00:00.000Z",
    84: "2018-09-23T18:00:00.000Z",
    90: "2018-09-24T00:00:00.000Z",
    96: "2018-09-24T06:00:00.000Z",
    102: "2018-09-24T12:00:00.000Z",
    108: "2018-09-24T18:00:00.000Z",
    114: "2018-09-25T00:00:00.000Z",
    120: "2018-09-25T06:00:00.000Z",
    126: "2018-09-25T12:00:00.000Z",
    132: "2018-09-25T18:00:00.000Z",
    138: "2018-09-26T00:00:00.000Z",
    144: "2018-09-26T06:00:00.000Z",
    150: "2018-09-26T12:00:00.000Z",
    156: "2018-09-26T18:00:00.000Z",
    162: "2018-09-27T12:00:00.000Z",
    168: "2018-09-28T06:00:00.000Z",
    174: "2018-09-29T00:00:00.000Z",
    180: "2018-09-29T18:00:00.000Z",
    186: "2018-09-30T12:00:00.000Z",
    192: "2018-10-01T06:00:00.000Z",
    198: "2018-10-02T06:00:00.000Z",
    204: "2018-10-03T18:00:00.000Z",
    210: "2018-10-05T06:00:00.000Z",
    216: "2018-10-06T18:00:00.000Z"
};

const firstStep = windFiles[0].split('T')[0];

const meta = {
    'retina resolution': true,
    'github.com/mapbox/webgl-wind': function () {
        window.location = 'https://github.com/mapbox/webgl-wind';
    }
};
meta[`${firstStep}+h`] = 0;

const timestampIdxs = Object.keys(windFiles);
const timestampStep = 6;

gui.add(meta, `${firstStep}+h`, Number(timestampIdxs[0]), Number(timestampIdxs[timestampIdxs.length-1]), timestampStep).onFinishChange(updateWind);

if (pxRatio !== 1) {
    gui.add(meta, 'retina resolution').onFinishChange(updateRetina);
}
gui.add(meta, 'github.com/mapbox/webgl-wind');
updateWind(0);
updateRetina();

function updateRetina() {
    const ratio = meta['retina resolution'] ? pxRatio : 1;
    canvas.width = canvas.clientWidth * ratio;
    canvas.height = canvas.clientHeight * ratio;
    wind.resize();
}

getJSON('https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_110m_coastline.geojson', function (data) {
    const canvas = document.getElementById('coastline');
    canvas.width = canvas.clientWidth * pxRatio;
    canvas.height = canvas.clientHeight * pxRatio;

    const ctx = canvas.getContext('2d');
    ctx.lineWidth = pxRatio;
    ctx.lineJoin = ctx.lineCap = 'round';
    ctx.strokeStyle = 'white';
    ctx.beginPath();

    for (let i = 0; i < data.features.length; i++) {
        const line = data.features[i].geometry.coordinates;
        for (let j = 0; j < line.length; j++) {
            ctx[j ? 'lineTo' : 'moveTo'](
                (line[j][0] + 180) * canvas.width / 360,
                (-line[j][1] + 90) * canvas.height / 180);
        }
    }
    ctx.stroke();
});

function updateWind(name) {
    getJSON('wind/' + windFiles[name] + '.json', function (windData) {
        const windImage = new Image();
        windData.image = windImage;
        windImage.src = 'wind/' + windFiles[name] + '.png';
        windImage.onload = function () {
            wind.setWind(windData);
        };
    });
}

function getJSON(url, callback) {
    const xhr = new XMLHttpRequest();
    xhr.responseType = 'json';
    xhr.open('get', url, true);
    xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) {
            callback(xhr.response);
        } else {
            throw new Error(xhr.statusText);
        }
    };
    xhr.send();
}
