var path = require('path');
const fs = require('fs');

exports.fsReadFileHtml = (fileName) => {
    return new Promise((resolve, reject) => {
        fs.readFile(path.join(__basedir, fileName), 'utf8', (error, htmlString) => {
            if (!error && htmlString) {
                resolve(htmlString);
            } else {
                reject(error)
            }
        });
    });
}