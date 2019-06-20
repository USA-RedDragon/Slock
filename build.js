#! /usr/bin/env node
const fs = require('fs');
const path = require('path');
const npmUtils = require('./utils/npm');
const fsUtils = require('./utils/fs');
const browserifyUtils = require('./utils/browserify');
const uglifyUtils = require('./utils/uglify');

const SHHLACK_PLACEHOLDER = '@@SHHLACK_PLACEHOLDER@@';
const CRYPTOJS_PLACEHOLDER = '// @@@@CRYPTOJS@@@@';

const CURRENT_DIR = __dirname;

const SRC_DIR = path.join(CURRENT_DIR, 'src');
const SRC_EXTENSION_DIR = path.join(SRC_DIR, 'extension');
const SRC_STANDALONE_DIR = path.join(SRC_DIR, 'standalone');

const BUILD_DIR = path.join(CURRENT_DIR, 'build');

const RELEASE_DIR = path.join(CURRENT_DIR, 'release');

const BUILD_EXTENSION_DIR = path.join(BUILD_DIR, 'extension');
const BUILD_STANDALONE_DIR = path.join(BUILD_DIR, 'standalone');

let shhlackPatch = fs.readFileSync('src/shhlack.js').toString();
const extensionTemplate = fs.readFileSync('src/templates/extension.tpl').toString();
const standaloneTemplate = fs.readFileSync('src/templates/standalone.tpl').toString();

fsUtils.copyFolderRecursiveSync(SRC_EXTENSION_DIR, BUILD_DIR);
fsUtils.copyFolderRecursiveSync(SRC_STANDALONE_DIR, BUILD_DIR);
fsUtils.copyFileSync(path.join(__dirname, 'package.json'), BUILD_STANDALONE_DIR);
fsUtils.copyFileSync(path.join(__dirname, 'README.md'), BUILD_STANDALONE_DIR);

fsUtils.copyFileSync(path.join(__dirname, 'README.md'), BUILD_EXTENSION_DIR);

async function build() {
    await npmUtils.installPackage('crypto-js');

    // Create crypto-js file for browserifying
    fs.mkdirSync('tmp');
    const cryptojsPath = path.join('tmp', 'crypto.js');
    const cryptojsBrowserifiedPath = path.join('tmp', 'crypto.js.browserified');
    fs.writeFileSync(cryptojsPath, 'cryptojs = require(\'crypto-js\')');

    // Browserify
    await browserifyUtils.browserify(cryptojsPath, fs.createWriteStream(cryptojsBrowserifiedPath));

    // Uglify
    const cryptoJSMinified = await uglifyUtils.uglify(fs.readFileSync(cryptojsBrowserifiedPath).toString());

    // Cleanup workdir
    fs.unlinkSync(cryptojsPath);
    fs.unlinkSync(cryptojsBrowserifiedPath);
    fs.rmdirSync('tmp');

    // Inject CryptoJS to Shhlack
    shhlackPatch = shhlackPatch.replace(CRYPTOJS_PLACEHOLDER, cryptoJSMinified);

    // Write Shhlack
    fs.writeFileSync(
        path.join(BUILD_EXTENSION_DIR, 'shhlack.js'),
        extensionTemplate.replace(SHHLACK_PLACEHOLDER, shhlackPatch));

    fs.writeFileSync(
        path.join(BUILD_STANDALONE_DIR, 'shhlack.js'),
        standaloneTemplate.replace(SHHLACK_PLACEHOLDER, shhlackPatch));

    if (process.argv[2] === '--release') {
        fsUtils.copyFolderRecursiveSync(BUILD_EXTENSION_DIR, RELEASE_DIR);
        fsUtils.copyFolderRecursiveSync(BUILD_STANDALONE_DIR, RELEASE_DIR);
    }

    // Uninstall crypto-js
    await npmUtils.uninstallPackage('crypto-js');
}

build();
