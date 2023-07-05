'use strict';

// var server = require('server');
// server.extend(module.superModule);

var PageMgr = require('dw/experience/PageMgr');
var URLUtils = require('dw/web/URLUtils');
var preferences = require('*/cartridge/config/preferences.js');

exports.Show = function () {
    var page = PageMgr.getPage(request.httpParameterMap.cid.stringValue);
    var content = PageMgr.renderPage(page.ID, '');

    if (page != null && page.isVisible()) {
        response.writer.print(content);
    } else {
        response.redirect(URLUtils.httpsHome().toString());
    }
};

exports.Show.public = true;

/**
 * Implementation of abobe datalayer for Default page
 */

exports.Landing = function () {
    if (preferences.enableAdobeDataLayer) {
        let adobeDataLayer = require('*/cartridge/scripts/datalayer.js');
        let viewData = response.getViewData();
        viewData.adobeDataLayer = {};
        viewData.adobeDataLayer.PageGroup = adobeDataLayer.pageTypes.CONTENT;
        viewData.adobeDataLayer.PageName = 'Hear BSHM';
        var sections = {};
        sections.section2 = '';
        sections.section3 = '';
        sections.section4 = '';
        viewData.adobeDataLayer.sections = sections;
        viewData.adobeDataLayer.Context = adobeDataLayer.CONTEXT.GLOBAL;
        response.setViewData(viewData);
    }
};

exports.Landing.public = true;
