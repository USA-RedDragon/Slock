const fs = require('fs');

module.exports.inject = (inputPng, sourceCode, template) => {
    const pngString = fs.readFileSync(inputPng).toString('base64');
    return sourceCode.replace(template, pngString);
};
