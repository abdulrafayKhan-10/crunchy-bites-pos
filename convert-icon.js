const toIco = require('to-ico');
const fs = require('fs');

const files = [
    fs.readFileSync('assets/icon.png')
];

toIco(files, {
    resize: true,
    sizes: [256, 128, 64, 48, 32, 16]
}).then(buf => {
    fs.writeFileSync('assets/icon.ico', buf);
    console.log('Icon converted successfully!');
}).catch(console.error);
