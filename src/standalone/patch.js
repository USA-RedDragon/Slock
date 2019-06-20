/* PATCHED BY Minded Security to add encryption features. See shhlack
REMOVE ME TO BOTTOM TO RECREATE ORIGINAL
FILE /usr/lib/slack/resources/app.asar.unpacked/src/static/ssb-interop.js
*/
(function() {
    try {
        const branch = 'master';
        const versionURL = `https://raw.githubusercontent.com/mindedsecurity/shhlack/${branch}/release/standalone/package.json`;
        const updateURL = `https://raw.githubusercontent.com/mindedsecurity/shhlack/${branch}/release/standalone/shhlack.js`;
        const os = require('os');
        const path = require('path');
        const fs = require('fs');
        const https = require('https');

        const shhlackHomePath = path.join(os.homedir(), '.shhlack');
        // Read Shhlack.js
        const shhlackPath = path.join(shhlackHomePath, 'shhlack.js');
        const shhlackJSContent = fs.readFileSync(shhlackPath) + '';
        eval(shhlackJSContent);

        // Read package.json to get version
        const shhlackPackagePath = path.join(shhlackHomePath, 'package.json');
        const localShhlackPackage = require(shhlackPackagePath);

        function httpget(url, onend, onerror, ondata, onresponse) {
            https.get(url, (resp) => {
                let data = '';
                if (onresponse) {
                    onresponse(resp);
                }

                // A chunk of data has been recieved.
                resp.on('data', (chunk) => {
                    if (ondata) {
                        return ondata(chunk);
                    }
                    data += chunk;
                });

                // The whole response has been received. Print out the result.
                resp.on('end', () => {
                    if (onend) {
                        onend(data);
                    }
                });
            }).on('error', (err) => {
                if (onerror) {
                    onerror(err);
                }
                // console.log("Error: " + err.message);
            });
        }
        function setError(errorObject) {
            localStorage.shhlack_new_version = errorObject;
        }
        httpget(versionURL, function onend(data) {
            try {
                const remoteVersion = JSON.parse(data).version;
                let downloadfile;
                const remoteVersionArray = remoteVersion.split('.');
                const localVersionArray = localShhlackPackage.version.split('.');

                const majorVersion = remoteVersionArray[0] !== localVersionArray[0];
                const minorVersion = remoteVersionArray[1] !== localVersionArray[1];
                const patchVersion = remoteVersionArray[2] !== localVersionArray[2];

                // Expecting that if minor or major version change the patcher needs update.
                // so user will have to download and install the whole package again
                if (minorVersion || majorVersion) {
                    alert(`Shhlack: New standalone version available ${remoteVersion} go to 
            https://github.com/mindedsecurity/shhlack/releases/download/${remoteVersion}/standalone-${remoteVersion}.zip`);
                    return;
                }
                /* else if difference is on patch version only we'll
         just download download the new version on
         ~/.shhlack/package_new.json
        and
          ~/.shhlack/shhlack_new.json
        */
                if (patchVersion) {
                    console.log('Shhlack: New Version Available! Do you want to download and install the new version?');
                    localStorage.shhlack_new_version = {
                        version: localShhlackPackage.version,
                        new_version: remoteVersion,
                    };

                    httpget(updateURL,
                        function onend() {
                            try {
                                downloadfile.end(function() {
                                    fs.writeFileSync(path.join(shhlackHomePath, 'package_new.json'), data);
                                    const response = confirm('Shhlack: New version downloaded, do you want to install it?');
                                    if (response) {
                                        fs.writeFileSync(shhlackPackagePath, fs.readFileSync(path.join(shhlackHomePath, 'package_new.json')));
                                        console.log(shhlackPath, path.join(shhlackHomePath, 'shhlack_new.js'), fs.readFileSync(path.join(shhlackHomePath, 'shhlack_new.js')) + '');
                                        fs.writeFileSync(shhlackPath, fs.readFileSync(path.join(shhlackHomePath, 'shhlack_new.js')) + '');
                                    }
                                });
                            } catch (exc) {
                                console.error(exc);
                                setError({
                                    version: localShhlackPackage.version,
                                    new_version: remoteVersion,
                                    error: exc.message,
                                    type: 'update',
                                });
                            }
                        },
                        function onerror(err) {
                            console.error(err);
                            setError({
                                version: localShhlackPackage.version,
                                new_version: remoteVersion,
                                error: err.message,
                                type: 'update',
                            });
                        },
                        function ondata(chunk) {
                            try {
                                downloadfile.write(chunk);
                            } catch (exc) {
                                console.error(exc);
                                setError({
                                    version: localShhlackPackage.version,
                                    new_version: remoteVersion,
                                    error: exc.message,
                                    type: 'update',
                                });
                            }
                        },
                        function onresponse(res) {
                            try {
                                downloadfile = fs.createWriteStream(path.join(shhlackHomePath, 'shhlack_new.js'), {
                                    flags: 'w',
                                    encoding: 'binary',
                                });
                            } catch (exc) {
                                console.error(exc);
                                setError({
                                    version: localShhlackPackage.version,
                                    new_version: remoteVersion,
                                    error: exc.message,
                                    type: 'update',
                                });
                            }
                        });
                }
            } catch (exc) {
                console.error(exc);
                setError({
                    error: exc.message,
                    type: 'check_version',
                });
            }
        }, function onerror(err) {
            console.error(err);
            setError({
                error: err.message,
                type: 'check_version',
            });
        });
    } catch (exc) {
        console.error(exc);
    }
})();
