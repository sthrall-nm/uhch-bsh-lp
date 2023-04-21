'use strict';

/**
 * @namespace Account
 */

var server = require('server');
server.extend(module.superModule);
var pageMetaData = require('*/cartridge/scripts/middleware/pageMetaData');
var Site = require('dw/system/Site');

/**
 * Account-Show : The Account-Show endpoint will render the shopper's account page. Once a shopper logs in they will see is a dashboard that displays profile, address, payment and order information.
 * @name Custom/Account-Show
 * @function
 * @memberof Account
 * @param {renders} - isml
 * @param {serverfunction} - get
 */
server.append('Show', function (req, res, next) {
    var currentSiteID = Site.current.ID;
    var currentSitePipeline = 'Sites-' + currentSiteID + '-Site';
    var preferences = require('*/cartridge/config/preferences.js');
    var pageMetaHelper = require('*/cartridge/scripts/helpers/pageMetaHelper');
    if (req.pageMetaData.title === currentSitePipeline) {
        var nameObj = JSON.parse(preferences.pageMetaTitle);
        pageMetaHelper.setPageMetaData(req.pageMetaData, nameObj['Account-Show']);
    }
    var viewData = {};
    var communicationPreference = session.privacy.communicationInstruction && session.privacy.communicationInstruction !== null ? session.privacy.communicationInstruction : '';
    viewData.communicationPreference = communicationPreference;
    res.setViewData(viewData);

    next();
}, pageMetaData.computedPageMetaData
);

/**
 * Account-SSO : The Account-SSO endpoint will called from the community on change password,
 * edit profile, login from community.
 * @name Custom/Account-SSO
 * @function
 * @memberof Account
 * @param {serverfunction} - get
 */
server.get('SSO', function (req, res, next) {
    var CustomerMgr = require('dw/customer/CustomerMgr');
    var URLUtils = require('dw/web/URLUtils');
    var consentTrackingValue = req.session.privacyCache.get('consent');
    if (customer.authenticated) {
        CustomerMgr.logoutCustomer(false);
    }
    req.session.privacyCache.set('consent', consentTrackingValue);
    var url = URLUtils.https('Login-OAuthLogin', 'oauthLoginTargetEndPoint', 1, 'target', consentTrackingValue);
    res.redirect(url);
    next();
});


/**
 * Account-Header : The Account-Header endpoint is used as a remote include to include the login/account menu in the header
 * @name Base/Account-Header
 * @function
 * @memberof Account
 * @param {middleware} - server.middleware.include
 * @param {querystringparameter} - mobile - a flag determining whether or not the shopper is on a mobile sized screen this determines what isml template to render
 * @param {category} - sensitive
 * @param {renders} - isml
 * @param {serverfunction} - get
 */

server.append('Header', server.middleware.include, function (req, res, next) {
    var URLUtils = require('dw/web/URLUtils');
    var viewData = res.getViewData();
    var oauthLoginTargetEndPoint = parseInt(req.querystring.oAuthId, 10);
    var signInUrl = URLUtils.https('Login-OAuthLogin', 'oauthLoginTargetEndPoint', oauthLoginTargetEndPoint || 1);
    var pid = req.querystring.pid;
    if (pid && (pid.includes('pid'))) {
        var productURLParam = 8 + '&' + pid;
        signInUrl = decodeURIComponent(URLUtils.https('Login-OAuthLogin', 'oauthLoginTargetEndPoint', productURLParam));
    }
    viewData.signInUrl = signInUrl;
    res.setViewData(viewData);
    next();
});
module.exports = server.exports();
