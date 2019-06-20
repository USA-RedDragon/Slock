const fs = require('fs');
const path = require('path');

module.exports.copyFileSync = (source, target) => {
    let targetFile = target;

    // if target is a directory a new file with the same name will be created
    if (fs.existsSync(target)) {
        if (fs.lstatSync(target).isDirectory()) {
            targetFile = path.join(target, path.basename(source));
        }
    }

    fs.writeFileSync(targetFile, fs.readFileSync(source));
};

module.exports.copyFolderRecursiveSync = (source, target) => {
    console.log('COPY', source, target);
    let files = [];
    if (!source) {
        throw new Error('no Source Name');
    }
    if (!target) {
        throw new Error('no target Name');
    }
    // check if folder needs to be created or integrated

    if (!fs.existsSync(target)) {
        fs.mkdirSync(target);
    }
    const targetFolder = path.join(target, path.basename(source));
    if (!fs.existsSync(targetFolder)) {
        fs.mkdirSync(targetFolder);
    }

    // copy
    if (fs.lstatSync(source).isDirectory()) {
        files = fs.readdirSync(source);
        files.forEach(function(file) {
            const curSource = path.join(source, file);
            if (fs.lstatSync(curSource).isDirectory()) {
                module.exports.copyFolderRecursiveSync(curSource, targetFolder);
            } else {
                module.exports.copyFileSync(curSource, targetFolder);
            }
        });
    }
};
