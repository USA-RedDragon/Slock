const UglifyJS = require('uglify-js');

module.exports.uglify = (code) => {
    return new Promise((resolve, reject) => {
        const output = UglifyJS.minify(code);
        if (output.error) {
            reject(output.error);
        } else {
            resolve(output.code);
        }
    });
};
