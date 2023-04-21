'use strict';

var server = require('server');
server.extend(module.superModule);
var preferences = require('*/cartridge/config/preferences.js');

/**
 * Implementation of abobe datalayer for checkout page
 */
server.append('SubmitCustomer', function (req, res, next) {
    if (preferences.enableAdobeDataLayer) {
        let adobeDataLayer = require('*/cartridge/scripts/datalayer.js');
        let viewData = res.getViewData();
        viewData.adobeDataLayer = {};
        var pageType = 'CHECKOUTSHIPPING';
        viewData.adobeDataLayer.PageGroup = adobeDataLayer.pageTypes.CHECKOUT;
        viewData.adobeDataLayer.PageName = adobeDataLayer.pageTypes[pageType];
        viewData.adobeDataLayer.Context = adobeDataLayer.CONTEXT.GLOBAL;
        var sections = {};
        sections.section2 = '';
        sections.section3 = '';
        sections.section4 = '';
        viewData.adobeDataLayer.sections = sections;
        res.setViewData(viewData);
    }
    next();
});

module.exports = server.exports();
