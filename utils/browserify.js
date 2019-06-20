const browserify = require('browserify')();

module.exports.browserify = (input, output) => {
    return new Promise((resolve, reject) => {
        browserify.add(input);
        const stream = browserify.bundle().pipe(output);
        stream.on('finish', () => {
            resolve();
        });
        stream.on('error', (error) => {
            reject(error);
        });
    });
};
