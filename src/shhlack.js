function sshlackInjector() {
    /* eslint-disable prefer-const */
    let cryptojs = {};
    // @@@@CRYPTOJS@@@@
    const CHAR = 's';
    const debug = true ? console.log.bind(console) : function() {};
    // ////////////////////////////////////////////////////////////////////////////////////
    // / TODO: Use background scripts to get password and prefixcommand
    const className = 'c-message__body';
    const searchClassName = 'message_body';
    const selectorSearchArray = ['.c-message_attachment__text > span', '.message_body', '.c-message__body'];
    const prefixCommand = '@@@@';
    const hmacPrefix = '####';
    let launchDialog;
    const passes = {
        personalKey: null, // if personalKey !== null enc/dec
        passphrases: { },
        currentKey: null,
        get: function get(key) {
            if (this.personalKey) {
                return decrypt(cryptojs.this.passphrases[key], this.personalKey);
            } else {
                return this.passphrases[key];
            }
        },
        set: function set(key, pass) {
            if (!pass) return;
            if (this.personalKey) {
                this.passphrases[key] = encrypt(cryptojs.this.passphrases[key], this.personalKey);
            } else {
                this.passphrases[key] = pass;
            }
            this.saveOnStorage();
        },
        remove: function remove(key) {
            delete this.passphrases[key];
            this.saveOnStorage();
        },
        hasKey: function(key) {
            return this.passphrases.hasOwnProperty(key);
        },
        setCurrentKey: function(key) {
            if (this.hasKey(key)) {
                this.currentKey = key;
                this.saveOnStorage();
            }
        },
        getCurrentKey: function(key) {
            if (this.currentKey != null) {
                return this.currentKey;
            } else if (this.getKeys().length > 0) {
                this.setCurrentKey(this.getKeys()[0]);
                return this.currentKey;
            } else {
                return null;
            }
        },
        getCurrentValue: function() {
            return this.get(this.currentKey);
        },
        getKeys: function getKeys() {
            return Object.keys(this.passphrases);
        },
        serializePassObject: function(obj) {
            obj = obj || this;
            return btoa(JSON.stringify({
                passphrases: obj.passphrases,
                currentKey: obj.currentKey,
            }));
        },
        deSerializePassObject: function(serialized, toObj) {
            toObj = toObj || this;
            if (serialized) {
                try {
                    serialized = atob(serialized);
                } catch (e) {};
                const obj = JSON.parse(serialized);
                if (Object.keys(obj.passphrases).length > 0) {
                    toObj.passphrases = obj.passphrases;
                    toObj.currentKey = obj.currentKey;
                }
            }
        },
        loadFromStorage: function loadFromStorage(text) {
            const savedPasses = text || localStorage.shhlack_passes;
            this.deSerializePassObject(savedPasses);
            // failsafe incongruency control
            const currentKey = this.getCurrentKey();
            const keys = this.getKeys();
            if (currentKey != null) {
                if (keys.length === 0) {
                    this.setCurrentKey(null);
                } else {
                    if (typeof this.get(this.getCurrentKey()) === 'undefined') {
                        this.setCurrentKey(keys[0]);
                    }
                }
            } else {
                if (keys.length > 0) {
                    this.setCurrentKey(keys[0]);
                }
            }
        },
        saveOnStorage: function saveOnStorage() {
            localStorage.shhlack_passes = this.serializePassObject();
        },
    };
    function isSlackApp() {
        return !!document.querySelector('#team_menu');
    }
    function signToHex(message, pass) {
        /* eslint-disable new-cap */
        return cryptojs.HmacSHA256(message, pass) + '';
    }

    const shouldBeTreated = function(msg) {
        return msg.indexOf(prefixCommand) !== -1;
    };

    const isMessage = function(el) {
        if (!el) {
            return false;
        }
        return (el.className.indexOf(className) !== -1 ||
      el.className.indexOf(searchClassName) !== -1 ||
      (el.parentNode && el.parentNode.querySelector(selectorSearchArray) === el))
      && shouldBeTreated(el.textContent);
    };

    const decrypt = function(msg, pass) {
        if (typeof msg !== 'string') {
            return null;
        }

        if (!pass) {
            pass = passes.getCurrentValue();
        }
        const t = cryptojs.AES.decrypt(msg, pass).toString(cryptojs.enc.Utf8);
        return t;
        return atob(msg);
    };
    const encrypt = function(msg, pass) {
        try {
            if (!pass) {
                pass = passes.getCurrentValue();
            }
            const t = cryptojs.AES.encrypt(msg, pass).toString();
            return t;
            return btoa(msg.replace(prefixCommand, ''));
        } catch (e) {
            return msg;
        }
    };

    function checkHmac(hmac, origMsg, pass) {
        return hmac === signToHex(origMsg, pass);
    }

    const parseEncryptedMsg = function(msg) {
    // / Format could be with or without title
    // / msg === '@@@@content####HMAC' < no title
    // / msg === 'title@@@@content####HMAC'
        const hmacpos = msg.lastIndexOf(hmacPrefix);
        if (hmacpos === -1) {
            throw Error('HMAC');
        }

        const origMsg = msg.substr(0, hmacpos);

        const hmac = msg.substr(hmacpos + hmacPrefix.length);
        let pass;
        let foundKey;
        passes.getKeys().some(function(key) {
            if (checkHmac(hmac, origMsg, passes.get(key))) {
                pass = passes.get(key);
                foundKey = key;
                return true;
            }
        });
        if (!pass) {
            throw Error('HMAC');
        }

        const pos = origMsg.indexOf(prefixCommand);

        return {
            title: origMsg.substr(0, pos),
            foundKey: foundKey,
            content: origMsg.substr(pos + prefixCommand.length),
        };
    };
    const parseMsg = function(msg) {
    // / Format could be with or without title
    // / msg === '@@@@content' < no title
    // / msg === 'title@@@@content'
        const pos = msg.indexOf(prefixCommand);
        return {
            title: msg.substr(0, pos),
            content: msg.substr(pos + prefixCommand.length),
        };
    };

    const decryptMsg = function decryptMsg(msg, format) {
        try {
            const parsed = parseEncryptedMsg(msg);

            let decMsg = decrypt(parsed.content.replace(prefixCommand, ''), passes.get(parsed.foundKey));
            if (format) {
                decMsg = TS.format.formatJustText(
                    parsed.title
                  + '\n *Encrypted: ('
                  + parsed.foundKey
                  + ')* \n```'
                  + decMsg.replace(/`/g, '&#x60;')
                  + '```');
            }
            debug('Decrypting msg', decMsg);
            return decMsg;
        } catch (e) {
            if (e.message !== 'HMAC') {
                console.error(e);
            }
            return msg;
        }
    };

    const encryptMsg = function encryptMsg(msg) {
        const parsed = parseMsg(msg);
        const encMsg = encrypt(parsed.content.replace(prefixCommand, ''));
        const message = parsed.title + prefixCommand + encMsg;
        return message + hmacPrefix + signToHex(message, passes.getCurrentValue());
    };

    // Expecting msg={title: "title", content:"content"}
    function sendEncryptedMessage(msg) {
        TS.client.ui.onSubmit(msg.title + prefixCommand + msg.content);
    }
    // /////////////////////////////////////////////////////////
    window.addEventListener('SHHLACK:MSG', function(ev) {
        if (!isSlackApp()) {
            return;
        }
        const msg = JSON.parse(ev.detail);
        sendEncryptedMessage(msg);
    });
    window.addEventListener('SHHLACK:CREATEMSG', function(ev) {
        if (!isSlackApp()) {
            return;
        }
        launchDialog();
    });
    const setContent = function(el, msg) {
        el.innerHTML = decryptMsg(msg, true);
        // el.textContent = decryptMsg(msg);
    };

    const findAndDecrypt = function(el) {
        el = el || document.body;
        if (isMessage(el)) {
            setContent(el, el.textContent);
        };
        const foundmsgs = el.querySelectorAll(selectorSearchArray.join(', '));
        [].forEach.call(foundmsgs, function(el) {
            // debug("Found", el.textContent);
            // TODO to format post decrypted msgs use
            // TS.format.formatJustText('```cccc````')?
            if (el.textContent.indexOf(prefixCommand) !== -1) {
                console.log(el.textContent, el.className, '!!!!!!!!!!!');
            };
            if (isMessage(el)) {
                setContent(el, el.textContent);
            }
        });
    };

    const patchForEncrypt = function() { // Wrapping TS.client.ui.onSubmit
        if (typeof TS !== 'undefined' && TS.client && TS.client.ui && TS.client.ui.onSubmit) {
            TS.client.ui.onSubmit = (function(origMethod) {
                return function(e) {
                    if (shouldBeTreated(e)) {
                        e = encryptMsg(e);
                    }
                    origMethod.apply(TS.client.ui, arguments);
                };
            })(TS.client.ui.onSubmit);
        } else {
            console.log('no slack TS.ui to patch');
        }
    };

    function hasNoPassesInDB() {
        return passes.getCurrentKey() == undefined || passes.getKeys().length === 0;
    }

    function maybeChangeShhlackIcon() {
        const shhlackIcon = $('#shhlackIcon');

        if (hasNoPassesInDB()) {
            shhlackIcon.removeClass('shhlackIcon');
            shhlackIcon.addClass('shhlackIcon_warn');
            $('#shhlack_ts_tip_tip_shhlack')
                .html(`Warning, No passphrases in database,<br>
                you should define at least one.<br>
                Opens Shhlack Dialog (Shortcut: Alt-s)`);
        } else {
            shhlackIcon.removeClass('shhlackIcon_warn');
            shhlackIcon.addClass('shhlackIcon');
            $('#shhlack_ts_tip_tip_shhlack')
                .text(`Opens Shhlack Dialog (Shortcut: Alt-s)`);
        }
    }

    function addShhlackIcon() {
        const html = `<style>
       .shhlackIcon{
        background:
                url(data:image/png;base64,@@@@shhlackIcon.png@@@@)
                no-repeat
                left center;
        background-size: 24px;
        height: 40px;
        line-height: 40px;
        z-index: 200;
        width: 28px;
        display: inline-block;
        }
      .shhlackIcon_warn{
        background: url(data:image/png;base64,@@@@shhlackWarningIcon.png@@@@)
                no-repeat
                left center;
        background-size: 24px;
        height: 40px;
        line-height: 40px;
        z-index: 200;
        width: 28px;
        display: inline-block;
      }
      #shhlack_button {
        display: inline-block;
        float: left;
        padding-left: 4px;
      }
      #footer_msgs {
        width: calc(100% - 35px);
        float: right;
      }
      #msg_form {
        margin-left : 0px;
      }
      </style>

      <button type="button" id="shhlackIcon" class="btn_unstyle shhlackIcon ts_tip
ts_tip_top
ts_tip_float
ts_tip_hidden"  aria-labelledby="shhlack_ts_tip_tip_shhlack" tabindex="-1">
              <i class="ts_icon">&nbsp;</i>
              <span id="shhlack_ts_tip_tip_shhlack"
              class="ts_tip_tip">Opens Shhlack Dialog (Shortcut: Alt-s)</span>
      </button>
    `;
        const footerMsgsDiv = document.querySelector('#footer');

        if (footerMsgsDiv) {
            let span = document.querySelector('#shhlack_button');
            if (!span) {
                span = document.createElement('div');
                span.id = 'shhlack_button';
            }
            span.innerHTML = html;
            footerMsgsDiv.appendChild(span);
            const shhlackIcon = footerMsgsDiv.querySelector('#shhlackIcon');
            if (shhlackIcon) {
                shhlackIcon.addEventListener('click',
                    function(ev) {
                        const cev = new CustomEvent('SHHLACK:CREATEMSG', {
                            bubbles: false,
                            cancelable: true,
                        });
                        window.dispatchEvent(cev);
                    });
            }
            maybeChangeShhlackIcon();
        }
    }
    // //////////////////////////////////////
    // ////////Observer
    // The node to be monitored
    window.addEventListener('load', function() {
        if (!isSlackApp()) {
            return;
        }
        passes.loadFromStorage();
        passmanageUI(document);
        addShhlackIcon();
        const target = document;
        // Patches TS.client.ui.onSubmit
        patchForEncrypt();

        // search for encrypted content
        findAndDecrypt(document.body);

        // Create an observer instance
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                const newNodes = mutation.addedNodes; // DOM NodeList
                const mTarget = mutation.target;
                if (newNodes !== null && newNodes.length > 0) { // If there are new nodes added
                    // debug("ADDED_1", newNodes);
                    newNodes.forEach(function(el) {
                        if (el.nodeType === 1) {
                            findAndDecrypt(el);

                            //  if(el.className === 'channel_title_info ' ){
                            //  console.log(el,"!!!!!!!!!!!")
                            //   passmanageUI(el)
                            // }
                        }
                    });
                }
            });
        });

        // Configuration of the observer:
        const config = {
            childList: true,
            subtree: true, // Gets Event for any child
        };

        // Pass in the target node, as well as the observer options
        observer.observe(target, config);
    });

    // // Alternative:
    // / wrap:
    // /  TS.ms.handleMsg and TS.ms.send
    // /

    // ////////////////////////////////////////////////////////////////
    // // Key Management
    // NB: TS.menu.$menu_items < the element to file menu
    function passmanageUI(targetEl) {
        function getDefaultKeyCheckbox() {
            return qs('#shhlackDefaultKeyCheckbox');
        }
        function getManageKeysDropDown() {
            return qs('#shhlack_key');
        }
        function getSendMessageKeysDropDown() {
            return qs('#shhlack_choosen_pass');
        }
        function updateDropDowns() {
            const datalistKeyEl = getManageKeysDropDown();
            getSendMessageKeysDropDown().innerHTML = getPairs();
            datalistKeyEl.innerHTML = getPairs();
            const selected = datalistKeyEl.selectedOptions;
            if (selected.length > 0 && selected[0].value === passes.getCurrentKey()) {
                getDefaultKeyCheckbox().checked = true;
            }
        }
        function encodeEntities(str) {
            return str && str.replace(/</g, '&lt;').replace(/"/g, '&quot;') || '';
        }
        function getPairs() {
            let keyPasses = '';
            const currentKey = passes.getCurrentKey();
            passes.getKeys().forEach(function(key) {
                keyPasses += `<option ${currentKey === key ? 'selected' : ''} `
                           + `value="${encodeEntities(key)}" >${encodeEntities(key)}`;
            });
            return keyPasses;
        }
        function getContentMessage() {
            return TS.utility.contenteditable.displayValue(TS.client.ui.$msg_input)
                .replace(/\u2018|\u2019/g, '\'').replace(/\u201c|\u201d/g, '"');
        }

        launchDialog = function launchDialog(tabIndex) {
            try {
                tabIndex = tabIndex || 0;
                if (tabIndex === 0 && hasNoPassesInDB()) {
                    tabIndex = 1;
                }
                TS.generic_dialog.start({
                    title: 'Shhlack Panel',
                    body: getContainer(),
                    onShow: function() {
                        const tempPasses = Object.assign({}, passes);
                        const datalistKeyEl = qs('#shhlack_key');
                        const datalistPassEl = qs('#shhlack_value');

                        const shhlackDefaultKeyCheckbox = getDefaultKeyCheckbox();
                        const textarea = qs('#shhlack_message_content');
                        textarea.textContent = getContentMessage();
                        textarea.addEventListener('keydown', function(ev) {
                            if (ev.ctrlKey && ev.key === 'Enter') {
                                TS.generic_dialog.go();
                            }
                        });
                        // Updates Passphrase
                        datalistPassEl.value = passes.getCurrentValue() || '';

                        // if (datalistKeyEl.selectedOptions[0].value === passes.getCurrentKey()) {
                        //   shhlackDefaultKeyCheckbox.checked = true;
                        // }

                        // Selector for tabs
                        qs('#shhlack_tab_set').addEventListener('click', function(e) {
                            const el = e.target;
                            const targetContent = qs('#' + el.dataset['content']);
                            $(targetContent).siblings().addClass('shhlack_hidden');
                            $(targetContent).removeClass('shhlack_hidden');
                            $(el).siblings().removeClass('selected');
                            $(el).addClass('selected');
                        });
                        // Select tab (default to first)
                        qs('#shhlack_tab_set').children[tabIndex].click();
                        // ////////////////////////////////
                        qs('#shhlack_file_upload').addEventListener('change', function(ev) {
                            const reader = new FileReader();
                            reader.onload = function(event) {
                                const content = event.target.result;
                                try {
                                    const passphrases = passes.loadFromStorage(content);
                                } catch (e) {
                                    alert('Error in decoding passphrases, not a JSON file');
                                }
                                // passes.passphrases = Object.assign(passphrases,passes.passphrases);
                                passes.saveOnStorage();
                                passmanageUI(targetEl);
                                // setOK with fade
                            };
                            reader.readAsText(ev.target.files[0]);
                        });

                        qs('#shhlack_upload').addEventListener('click', function() {
                            $('#shhlack_file_upload').click();
                        });

                        qs('#shhlack_download').addEventListener('click', function() {
                            const content = passes.serializePassObject();
                            const blob = new Blob([content], {
                                type: 'octet/stream',
                            });

                            url = window.URL.createObjectURL(blob);
                            // var anchor = qs('#shhlack_downloader');
                            this.href = url;
                            this.target = '_blank';
                            this.download = 'shhlack_passphrases.json';
                            // anchor.click();
                            passmanageUI(targetEl);
                            window.URL.revokeObjectURL(url);
                        });
                        // ////////////////////////////////
                        // Set current Key
                        shhlackDefaultKeyCheckbox.addEventListener('change', function(ev) {
                            passes.setCurrentKey(datalistKeyEl.value);
                            updateDropDowns();
                        });

                        getSendMessageKeysDropDown().addEventListener('change', function(ev) {
                            const val = ev.target.value;
                            passes.setCurrentKey(val);
                            updateDropDowns();
                        });

                        qs('#shhlack_delete').addEventListener('click', function(ev) {
                            const key = datalistKeyEl.value;
                            const response = confirm('Are you sure you want to delete: ' + key);

                            if (response) {
                                passes.remove(key);
                                const keys = passes.getKeys();

                                if (keys.length > 1 && key === passes.getCurrentKey()) {
                                    // if deleted key was the current one it'll reset to the first
                                    passes.setCurrentKey(keys[0]);
                                } else { // No more passes
                                    passes.setCurrentKey(null);
                                }
                                passmanageUI(targetEl);
                            }
                        });
                        qs('#shhlack_add_label').addEventListener('click', function(ev) {
                            $('#shhlack_add').click();
                        });
                        qs('#shhlack_add').addEventListener('click', function(ev) {
                            $('#shhlack_add_form').toggle();
                        });

                        qs('#shhlack_add_ok').addEventListener('click', function(ev) {
                            const keyEl = qs('#shhlack_new_key');
                            const valueEl = qs('#shhlack_new_value');
                            let overwrite = true;

                            if (typeof passes.get(keyEl.value) !== 'undefined') {
                                overwrite = confirm('A passphrase named `'
                                  + keyEl.value
                                  + '` already exists. Do you want to modify it?');
                            }
                            if (overwrite) {
                                passes.set(keyEl.value, valueEl.value);
                            } else {
                                return;
                            }
                            if (passes.getCurrentKey() == null) {
                                passes.setCurrentKey(keyEl.value);
                            }
                            keyEl.value = '';
                            valueEl.value = '';
                            $('#shhlack_add_form').toggle();
                            datalistPassEl.value = passes.getCurrentValue() || '';
                            passmanageUI(targetEl);
                        });

                        qs('#shhlack_add_cancel').addEventListener('click', function(ev) {
                            const keyEl = qs('#shhlack_new_key');
                            const valueEl = qs('#shhlack_new_value');
                            keyEl.value = '';
                            valueEl.value = '';
                            $('#shhlack_add_form').toggle();
                        });

                        datalistKeyEl.addEventListener('change', function(ev) {
                            const key = ev.target.value;
                            if (key === passes.getCurrentKey()) {
                                shhlackDefaultKeyCheckbox.checked = true;
                            } else {
                                shhlackDefaultKeyCheckbox.checked = false;
                            }
                            datalistPassEl.value = passes.get(key);
                        });
                    },
                    show_cancel_button: true,
                    esc_for_ok: true,
                    go_button_text: TS.interop.i18n.t('OK', 'client')(),
                    onGo: function e() {
                        // getSelected Tab
                        const elem = qs('.tab_anchor.selected');
                        if (elem && elem.dataset['content'] === 'shhlack_message') {
                            const content = qs('#shhlack_message_content').value;
                            if (content != '') {
                                sendEncryptedMessage({
                                    title: qs('#shhlack_message_title').value,
                                    content: content,
                                });
                            }
                        } /* else if(elem && elem.dataset['content'] === 'shhlack_pairs'){

              }else if(elem && elem.dataset['content'] === 'shhlack_master'){

              }*/
                        findAndDecrypt();
                    },
                });
            } catch (exc) {
                console.error(exc);
            }
        };
        function getContainer() {
            const containerHtml = `
    <span id="shhlack_container">
    <style>
    .tab_set{
        position:relative;
        max-height:3rem;
        display:flex
    }
     .tab_set a{
        padding: 0.5rem;
        font-weight:700;
        margin-bottom:-1px;
        border:1px solid transparent;
        border-top-right-radius:.25rem;
        border-bottom-right-radius:0;
        border-bottom-left-radius:0;
        border-top-left-radius:.25rem;
        background-clip:padding-box;
        text-overflow:ellipsis;
        overflow:hidden;
        white-space:nowrap;
        max-width:100%
    }
     .tab_set.compressed a{
        padding-left:22px;
        padding-right:22px
    }
     .tab_set a.secondary.selected,.tab_set a.selected{
        border:1px solid #e8e8e8;
        background:#fff;
        border-bottom-color:#fff;
        color:#2c2d30;
        cursor:default
    }
     .tab_set a.selected.is_linked{
        cursor:pointer
    }
     .tab_set a.selected:hover{
        text-decoration:none
    }
     .tab_set a.secondary{
        margin-left:auto;
        color:#717274
    }
     .tab_set a.secondary~a.secondary{
        margin-left:0
    }
     .tab_set .tab_caret{
        display:none
    }
     .tab_pane{
      display:none;
      background:#fff;
      border-radius:0 0 .25rem .25rem;
      box-shadow:0 1px 0 rgba(0,0,0,.25);
      padding:2rem 2rem 1rem;
      margin:0 auto 3rem;
      border:1px solid #e8e8e8
    }
    .tab_pane.selected{
      display:block
    }
    .tab_pane.selected.display_flex{
      display:flex
    }
    .tab_actions{
      background:#fff;
      height:4.5rem;
      padding:1rem;
      border:1px solid #e8e8e8;
      margin-bottom:-1px
    }

    #shhlackIcon{
      background:
            url(data:image/png;base64,@@@@shhlackIcon.png@@@@)
            no-repeat
            left center;
    }
    #shhlack_message_title{
      width: 65%;
    }

    #shhlack_value{
      width: 55%;
      line-height: normal;
    }

    .shhlack_hidden {
      display: none;
     }

    #shhlack_eye, #shhlack_add_label{
      cursor: pointer;
    }

    .shhlack_brought_to_you_footer {
      font-size: 0.7rem;
      position: absolute;
      right: 2rem;
    }

    </style>
    <div id="shhlack_tab_set" class="account_tab_set tab_set on_neutral_grey">
      <a class="tab_anchor"  data-content="shhlack_message">Send Message</a>
      <a class="tab_anchor"  data-content="shhlack_pairs" >Manage Passphrases</a>
      <a class="tab_anchor"  data-content="shhlack_master" >Master Key</a>
    </div>

    <section id="shhlack_tab_show_content" class="tab_pane selected clearfix" >
     <div id="shhlack_tabs_content" >
       <div class="shhlack_tabs_content shhlack_hidden" id="shhlack_message">
        <div class="top_margin">
         <label class="select small float_right no_right_padding">
          <select id="shhlack_choosen_pass" class="small no_top_margin">
           ${getPairs()}
          </select>
         </label>
         <input type="text" class="small" id="shhlack_message_title" value="" placeholder="Title (optional)">
        </div>

        <div class="top_margin bottom_margin">
         <textarea name="content" id="shhlack_message_content" class=" full_width" ></textarea>
        </div>
       </div>
       <div class="shhlack_tabs_content shhlack_hidden" id="shhlack_pairs" >
        <div class="top_margin ">
         <div class="row-fluid padding_25">
          <div class="span12">
           <!-- UPLOAD -->
           <span id="shhlack_upload"
              class="current_status_clear_icon_cover ts_tip ts_tip_top ts_tip_float ts_tip_hidden"
              aria-labelledby="shhlack_ts_tip_tip_3"
              style="cursor: pointer" >
            <input id="shhlack_file_upload" type="file" class="shhlack_hidden">
            <i class="c-deprecated-icon c-icon--upload" type="cloud-download" aria-hidden="true"></i></a>
            <span id="shhlack_ts_tip_tip_3" class="ts_tip_tip">Restore all Passphrase from backup file</span>
           </span>
           <!-- DOWNLOAD -->
           <span
              id=""
              class="current_status_clear_icon_cover ts_tip ts_tip_top ts_tip_float ts_tip_hidden"
              aria-labelledby="shhlack_ts_tip_tip_4" style="cursor: pointer" >
            <a href="#" id="shhlack_download">
             <i class="c-deprecated-icon c-icon--download" type="cloud-download" aria-hidden="true"></i></a>
             <span id="shhlack_ts_tip_tip_4" class="ts_tip_tip">Download all Passphrase as backup</span>
            </a>
           </span>
           </div>
           <div class="row-fluid padding_25">
           <!-- SET AS DEFAULT -->
           <label for="shhlackDefaultKeyCheckbox" style="width: auto; min-width: auto;">Default
            <input type="checkbox" style="margin: 0 0 4px 4px;" id="shhlackDefaultKeyCheckbox">
           </label>
          </div>
         </div>
         <div class="row-fluid padding_25">
          <div class="span11">
           <!-- SELECT KEY -->
           <label class="select small no_right_padding" style="width:100%">
            <select id="shhlack_key" class="small no_top_margin">
             ${getPairs()}
            </select>
           </label>
          </div>
                <div class="span1 padding_left_100">
                  <!-- DELETE -->
                  <span
                    id="shhlack_delete"
                    class="current_status_clear_icon_cover ts_tip ts_tip_top ts_tip_float ts_tip_hidden padding_top_50"
                    aria-labelledby="shhlack_ts_tip_tip_2 padding_top_50"
                    style="cursor: pointer" >
                    <ts-icon class="ts_icon_trash prefix"></ts-icon>
                    <span id="shhlack_ts_tip_tip_2" class="ts_tip_tip">Delete Passphrase</span>
                  </span>
                </div>
              </div>
          <div class="row-fluid padding_25">
          <div class="span11">
           <!-- INPUT PASSPHRASE -->
           <input
              type="password"
              disabled
              class="small full_width no_margin"
              id="shhlack_value"
              value=""
              placeholder="Passphrase here">
          </div>
          <div class="span1 padding_left_100">
           <!-- SHOW PASSPHRASE -->
           <span
              id="shhlack_eye"
              class="ts_tip ts_tip_bottom ts_tip_float inline_block ts_tip_hidden padding_top_50"
              onclick="
                var pass=document.querySelector('#shhlack_value');pass.type=pass.type==='password'?'text':'password'
              ">
            <ts-icon class="ts_icon_eye prefix"></ts-icon>
            <span id="shhlack_ts_tip_tip_1" class="ts_tip_tip">Show Passphrase</span>
           </span>
                </div>
         </div>
              <div class="row-fluid padding_25">
                <span id="shhlack_add_label">
                  Add new passphrase
                </span>
                <!-- ADD -->
                <span
                  id="shhlack_add"
                  class="current_status_clear_icon_cover ts_tip ts_tip_top ts_tip_float ts_tip_hidden"
                  aria-labelledby="shhlack_ts_tip_tip_2"
                  style="cursor: pointer;  top: 4px;" >
                  <ts-icon class="ts_icon_plus prefix"></ts-icon>
                  <span id="shhlack_ts_tip_tip_2" class="ts_tip_tip">Add new Passphrase</span>
                </span>
              </div>
              <div class="row-fluid padding_25">
          <div class="span11">
                  <!-- ADD -->
                  <div id="shhlack_add_form" style="display: none; border: 1px solid #e8e8e8;" class="padding_75">

                    <div class="row-fluid padding_25">
                <div class="span12">
                        <!-- INPUT KEY -->
                        <input
                          type="text"
                          class="small full_width padding_bottom_50"
                          id="shhlack_new_key"
                          value=""
                          placeholder="Passphrase name">
                      </div>
                    </div>
                    <div class="row-fluid padding_25">
                <div class="span12">
                        <!-- INPUT PASSPHRASE -->
                        <input
                          type="password"
                          class="small full_width "
                          id="shhlack_new_value"
                          value=""
                          placeholder="Pre shared passphrase">
                      </div>
                    </div>
                    <div class="current_status_action_buttons align_right">
                      <button
                        id="shhlack_add_cancel"
                        type="button"
                        class="btn btn_small btn_outline current_status_cancel_button">Cancel</button>
                      <button
                        id="shhlack_add_ok"
                        type="button"
                        class="btn btn_small btn_success current_status_save_button">Add</button>
                    </div>
                  </div>
                </div>
              </div>
        </div>
       </div>
       <div class="shhlack_tabs_content shhlack_hidden" id="shhlack_master" >
       <div class="top_margin">
        <label style="width: 20%" for="shhlack_master_checkbox">
          Enable Master
          <input type="checkbox" style="width: 10%" id="shhlack_master_checkbox" style="width: 66%"
             onchange="alert('not implemented yet');return ;">
             <!-- var t=document.querySelector('#shhlack_personal_master_key');t.disabled=!this.checked" -->
        </label>
        <input
          style="width: 50%"
          id="shhlack_personal_master_key"
          class="small no_top_margin"
          disabled
          type="password" >
       </div>
       </div>
     </div>
     <span class="shhlack_brought_to_you_footer">
      Shhlack is brought to you by <a href="https://www.mindedsecurity.com/" target="_blank">MindedSecurity</a>.
      Shhlack <a href="https://github.com/mindedsecurity/shhlack/" target="_blank">Source</a>
     </span>
    </section>

  </span>
  `;
            return containerHtml;
        }
        const qs = targetEl.querySelector.bind(targetEl);
        const qsall = targetEl.querySelectorAll.bind(targetEl);

        maybeChangeShhlackIcon();

        const containerEl = qs('#shhlack_container');
        const currentKey = passes.getCurrentKey();
        if (!containerEl) {
            document.addEventListener('keyup', function(ev) {
                if (ev.altKey && ev.key === CHAR && !TS.generic_dialog.is_showing) {
                    launchDialog(0);
                } else if (ev.key === 'Escape' && TS.generic_dialog.is_showing) {
                    TS.generic_dialog.cancel();
                }
            });
            return;
        } else {
            updateDropDowns();
        }
    }
}
