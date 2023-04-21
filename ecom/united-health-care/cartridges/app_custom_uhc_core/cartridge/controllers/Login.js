'use strict';

/**
 * @namespace Login
 */

var server = require('server');
server.extend(module.superModule);

var consentTracking = require('*/cartridge/scripts/middleware/consentTracking');
var pageMetaData = require('*/cartridge/scripts/middleware/pageMetaData');

/**
 * Login-OAuthLogin : This endpoint invokes the External OAuth Providers Login
 * @name Base/Login-OAuthLogin
 * @function
 * @memberof Login
 * @param {middleware} - server.middleware.https
 * @param {middleware} - consentTracking.consent
 * @param {querystringparameter} - oauthProvider - ID of the OAuth Provider. e.g. Facebook, Google
 * @param {querystringparameter} - oauthLoginTargetEndPoint - Valid values for this parameter are 1 or 2. These values are mapped in oAuthRenentryRedirectEndpoints.js
 * @param {category} - sensitive
 * @param {renders} - isml if there is an error
 * @param {serverfunction} - get
 */
server.replace('OAuthLogin', server.middleware.https, consentTracking.consent, function (req, res, next) {
    var oauthLoginFlowMgr = require('dw/customer/oauth/OAuthLoginFlowMgr');
    var Resource = require('dw/web/Resource');
    var endpoints = require('*/cartridge/config/oAuthRenentryRedirectEndpoints');

    var targetEndPoint = req.querystring.oauthLoginTargetEndPoint
        ? parseInt(req.querystring.oauthLoginTargetEndPoint, 10)
        : null;
    var pid = req.querystring.pid;
    if (targetEndPoint && targetEndPoint === 8 && endpoints[targetEndPoint] && pid && pid !== null) {
        req.session.privacyCache.set(
            'oauthLoginTargetEndPoint',
            endpoints[targetEndPoint] + '?pid=' + pid
        );
    } else if (targetEndPoint && endpoints[targetEndPoint]) {
        req.session.privacyCache.set(
            'oauthLoginTargetEndPoint',
            endpoints[targetEndPoint]
        );
    } else {
        res.render('/error', {
            message: Resource.msg('error.oauth.login.failure', 'login', null)
        });

        return next();
    }

    var preferences = require('*/cartridge/config/preferences.js');
    var oauthProvider = preferences.oauthProvider;

    var result = oauthLoginFlowMgr.initiateOAuthLogin(oauthProvider);

    if (result) {
        res.redirect(result.location);
    } else {
        res.render('/error', {
            message: Resource.msg('error.oauth.login.failure', 'login', null)
        });

        return next();
    }

    return next();
});
/**
 * Login-OAuthReentry : This endpoint is called by the External OAuth Login Provider (Facebook, Google etc. to re-enter storefront after shopper logs in using their service
 * @name Base/Login-OAuthReentry
 * @function
 * @memberof Login
 * @param {middleware} - server.middleware.https
 * @param {middleware} - consentTracking.consent
 * @param {querystringparameter} - code - given by facebook
 * @param {querystringparameter} - state - given by facebook
 * @param {category} - sensitive
 * @param {renders} - isml only if there is a error
 * @param {serverfunction} - get
 */
server.replace('OAuthReentry', server.middleware.https, consentTracking.consent, function (req, res, next) {
    var URLUtils = require('dw/web/URLUtils');
    var Logger = require('dw/system/Logger');
    var oauthLoginFlowMgr = require('dw/customer/oauth/OAuthLoginFlowMgr');
    var CustomerMgr = require('dw/customer/CustomerMgr');
    var Transaction = require('dw/system/Transaction');
    var Resource = require('dw/web/Resource');
    var newCustomer;

    var consentTrackingValue = req.session.privacyCache.get('consent');
    try {
        var destination = req.session.privacyCache.store.oauthLoginTargetEndPoint;

        var finalizeOAuthLoginResult = oauthLoginFlowMgr.finalizeOAuthLogin();
        if (!finalizeOAuthLoginResult) {
            res.redirect(URLUtils.url('Login-Show'));
            return next();
        }

        var response = finalizeOAuthLoginResult.userInfoResponse.userInfo;
        var oauthProviderID = finalizeOAuthLoginResult.accessTokenResponse.oauthProviderId;

        if (!oauthProviderID) {
            res.render('/error', {
                message: Resource.msg('error.oauth.login.failure', 'login', null)
            });

            return next();
        }

        if (!response) {
            res.render('/error', {
                message: Resource.msg('error.oauth.login.failure', 'login', null)
            });

            return next();
        }

        var externalProfile = JSON.parse(response);
        Logger.debug('Identity response {0}', JSON.stringify(externalProfile));

        if (!externalProfile) {
            res.render('/error', {
                message: Resource.msg('error.oauth.login.failure', 'login', null)
            });

            return next();
        }

        var userID = externalProfile.id || externalProfile.user_id;
        if (!userID) {
            res.render('/error', {
                message: Resource.msg('error.oauth.login.failure', 'login', null)
            });

            return next();
        }

        var authenticatedCustomerProfile = CustomerMgr.getExternallyAuthenticatedCustomerProfile(
            oauthProviderID,
            userID
        );

        if (!authenticatedCustomerProfile) {
            // Create new profile
            Transaction.wrap(function () {
                newCustomer = CustomerMgr.createExternallyAuthenticatedCustomer(
                    oauthProviderID,
                    userID
                );

                authenticatedCustomerProfile = newCustomer.getProfile();
            });
        }

        // updating the customer data
        Transaction.wrap(function () {
            var firstName;
            var lastName;
            var email;

            // Google comes with a 'name' property that holds first and last name.
            if (typeof externalProfile.name === 'object') {
                firstName = externalProfile.name.givenName;
                lastName = externalProfile.name.familyName;
            } else {
                // The other providers use one of these, GitHub has just a 'name'.
                firstName = externalProfile.given_name;
                lastName = externalProfile.family_name;
            }

            email = externalProfile['email-address'] || externalProfile.email;

            if (!email) {
                var emails = externalProfile.emails;

                if (emails && emails.length) {
                    email = externalProfile.emails[0].value;
                }
            }
            authenticatedCustomerProfile.setFirstName(firstName);
            authenticatedCustomerProfile.setLastName(lastName);
            authenticatedCustomerProfile.setEmail(email);
        });

        var credentials = authenticatedCustomerProfile.getCredentials();
        if (credentials.isEnabled()) {
            Transaction.wrap(function () {
                CustomerMgr.loginExternallyAuthenticatedCustomer(oauthProviderID, userID, false);
            });
        } else {
            res.render('/error', {
                message: Resource.msg('error.oauth.login.failure', 'login', null)
            });

            return next();
        }
        req.session.privacyCache.clear();

        if (externalProfile.custom_attributes) {
            Transaction.wrap(function () {
                if (externalProfile.custom_attributes.home_phone && externalProfile.custom_attributes.home_phone !== null) {
                    authenticatedCustomerProfile.setPhoneHome(externalProfile.custom_attributes.home_phone);
                }
                if (externalProfile.custom_attributes.sfdc_contact_id && externalProfile.custom_attributes.sfdc_contact_id !== null) {
                    authenticatedCustomerProfile.custom.sfdcContactID = externalProfile.custom_attributes.sfdc_contact_id;
                }
            });
            var sessionStorageHelper = require('*/cartridge/scripts/helpers/sessionStorageHelper');
            sessionStorageHelper.setCustomerdetailInSessionLogin(externalProfile);
            sessionStorageHelper.setCustomerType(req);
        }

        var eligibilityHelper = require('*/cartridge/scripts/helpers/eligibilityHelper');
        eligibilityHelper.getCustomerDetails(externalProfile);

        // displaying different types of registration model
        if (newCustomer) {
            eligibilityHelper.displayRegistrationModel();
        }

        // updating the pricebook if it is avaiable in the session
        eligibilityHelper.updatePriceBook();

        req.session.privacyCache.set('consent', consentTrackingValue);
        res.redirect(decodeURIComponent(URLUtils.url(destination)));
    } catch (error) {
        Logger.error('Error while login {0}', JSON.stringify(error));
        // handled for the bookmark url
        // try to attempt login for only one time
        var url = URLUtils.https('Login-OAuthLogin', 'oauthLoginTargetEndPoint', 7);
        if (req.session.privacyCache.get('loginFailAttempt')) {
            url = URLUtils.https('Home-Show');
        }
        req.session.privacyCache.clear();
        req.session.privacyCache.set('consent', consentTrackingValue);
        if (!req.session.privacyCache.get('loginFailAttempt')) {
            req.session.privacyCache.set('loginFailAttempt', true);
        }
        res.redirect(url);
    }

    return next();
});

/**
 * Login-OAuthLogin : This endpoint invokes the External OAuth Providers Login
 * Prepending to add consent tracking to session
 * @name Base/Login-OAuthLogin
 * @function
 * @memberof Login
 * @param {middleware} - server.middleware.https
 * @param {middleware} - consentTracking.consent
 * @param {querystringparameter} - oauthProvider - ID of the OAuth Provider. e.g. Facebook, Google
 * @param {querystringparameter} - oauthLoginTargetEndPoint - Valid values for this parameter are 1 or 2. These values are mapped in oAuthRenentryRedirectEndpoints.js
 * @param {category} - sensitive
 * @param {renders} - isml if there is an error
 * @param {serverfunction} - get
 */
server.prepend('OAuthLogin', server.middleware.https, consentTracking.consent, function (req, res, next) {
    var consent = req.session.privacyCache.get('consent') || (req.querystring.target === 'true');
    req.session.raw.setTrackingAllowed(consent);
    req.session.privacyCache.set('consent', consent);
    return next();
});
/**
 * Login-Logout : This endpoint is called to log shopper out of the session
 * @name Base/Login-Logout
 * @function
 * @memberof Login
 * @param {category} - sensitive
 * @param {serverfunction} - get
 * @renders
 */
server.replace('Logout', function (req, res, next) {
    var CustomerMgr = require('dw/customer/CustomerMgr');
    CustomerMgr.logoutCustomer(false);
    var preferences = require('*/cartridge/config/preferences.js');

    var communityLogoutURL = preferences.communityLogoutURL;
    res.redirect(communityLogoutURL);
    next();
});

/**
 * Login-Show : This endpoint is called to load the login page
 * @name Base/Login-Show
 * @function
 * @memberof Login
 * @param {middleware} - consentTracking.consent
 * @param {middleware} - server.middleware.https
 * @param {middleware} - csrfProtection.generateToken
 * @param {querystringparameter} - rurl - Redirect URL
 * @param {querystringparameter} - action - Action on submit of Login Form
 * @param {category} - sensitive
 * @param {renders} - isml
 * @param {serverfunction} - get
 */
server.prepend(
    'Show',
    function (req, res, next) {
        var Site = require('dw/system/Site');
        var currentSiteID = Site.current.ID;
        var currentSitePipeline = 'Sites-' + currentSiteID + '-Site';
        var preferences = require('*/cartridge/config/preferences.js');
        var pageMetaHelper = require('*/cartridge/scripts/helpers/pageMetaHelper');
        if (req.pageMetaData.title === currentSitePipeline) {
            var nameObj = JSON.parse(preferences.pageMetaTitle);
            pageMetaHelper.setPageMetaData(req.pageMetaData, nameObj['Order-Track']);
        }
        return next();
    }, pageMetaData.computedPageMetaData
);

module.exports = server.exports();
