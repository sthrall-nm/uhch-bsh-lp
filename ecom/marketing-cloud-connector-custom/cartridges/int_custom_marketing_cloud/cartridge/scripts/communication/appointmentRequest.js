/* eslint-disable valid-jsdoc */
'use strict';

var sendTrigger = require('*/cartridge/scripts/communication/util/send').sendTrigger;
var hookPath = 'app.communication.appointment.';
var Logger = require('dw/system/Logger');

/**
 * Sends account created notification
 * @param {SynchronousPromise} promise
 * @param {CustomerNotification} data
 * @returns {SynchronousPromise}
 */
function request(promise, data) {
    Logger.debug('Handler hook {0} executed', 'appointment.request');
    return sendTrigger(hookPath + 'request', promise, data);
}

/**
 * Declares attributes available for data mapping configuration
 * @returns {Object} Map of hook function to an array of strings
 */
function triggerDefinitions() {
    var sfraInstalled = require('int_marketing_cloud').sfraInstalled();

    if (sfraInstalled) {
        return {
            contactUs: {
                description: 'Contact Us trigger',
                attributes: [
                    'ContactUs.firstname'
                ]
            }
        };
    }
    return '';
}

module.exports = require('dw/system/HookMgr').callHook(
    'app.communication.handler.initialize',
    'initialize',
    require('*/cartridge/scripts/communication/handler').handlerID,
    'app.communication.appointment',
    {
        request: request
    }
);

// non-hook exports
module.exports.triggerDefinitions = triggerDefinitions;
