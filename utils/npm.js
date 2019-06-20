const spawn = require('cross-spawn');

module.exports.installPackage = (package) => {
    return new Promise((resolve, reject) => {
        const npmExec = 'npm';
        const npmArgs = [
            'install',
            '--save',
            '--save-exact',
            '--loglevel',
            'error',
            package,
        ];
        const child = spawn(npmExec, npmArgs, { stdio: 'inherit' });
        child.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`${npmExec} ${npmArgs.join(' ')}`));
                return;
            }
            resolve();
        });
    });
};

module.exports.uninstallPackage = (package) => {
    return new Promise((resolve, reject) => {
        const npmExec = 'npm';
        const npmArgs = [
            'uninstall',
            '--loglevel',
            'error',
            package,
        ];
        const child = spawn(npmExec, npmArgs, { stdio: 'inherit' });
        child.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`${npmExec} ${npmArgs.join(' ')}`));
                return;
            }
            resolve();
        });
    });
};
