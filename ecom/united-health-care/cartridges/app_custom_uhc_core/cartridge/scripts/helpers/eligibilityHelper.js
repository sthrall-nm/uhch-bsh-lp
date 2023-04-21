'use strict';

var StringUtils = require('dw/util/StringUtils');
var Calendar = require('dw/util/Calendar');
var Logger = require('dw/system/Logger');
var preferences = require('*/cartridge/config/preferences');

/**
 * helper for the middleware api
 * @param {Object} externalProfile - Object
 * @returns {Object} middleware API response
 */
function getMiddleware(externalProfile) {
    var middlewareAPIResponse = '';
    var middlewareRequest = {
        sfdc_contact_id: externalProfile.custom_attributes.sfdc_contact_id,
        subnum: externalProfile.source ? externalProfile.custom_attributes.AARP_Subscriber_ID : externalProfile.custom_attributes.subscriber_id || '',
        lastname: externalProfile.family_name,
        firstname: externalProfile.given_name,
        dob: StringUtils.formatCalendar(new Calendar(new Date(externalProfile.custom_attributes.birthdate)), 'MM/dd/yyyy'),
        city: '',
        state: '',
        zipCode: externalProfile.custom_attributes.ZipCode && externalProfile.custom_attributes.ZipCode !== null ? externalProfile.custom_attributes.ZipCode : '',
        email: externalProfile.email,
        source: externalProfile.source ? externalProfile.source : 0
    };
    var middleware = require('*/cartridge/scripts/services/MiddlewareService');
    var middlewareAPI = middleware.call(middlewareRequest, false);
    if (middlewareAPI.error === 401) {
        middlewareAPI = middleware.call(middlewareRequest, true);
    }
    if (middlewareAPI.status === 'OK') {
        middlewareAPIResponse = middlewareAPI.object.resource ? middlewareAPI.object.resource[0] : middlewareAPI.object;
    }
    Logger.debug('Middleware API {0}', JSON.stringify(middlewareAPIResponse));
    return middlewareAPIResponse;
}

/**
 * helper for the Eligibility api
 * @param {Object} externalProfile - Object
 * @param {Object} middlewareAPIResponse - Object
 * @returns {Object} Eligibility API response
 */
function getEligibility(externalProfile, middlewareAPIResponse) {
    var eligibilityRequest = {
        sfdc_contact_id: externalProfile.custom_attributes.sfdc_contact_id,
        dataSrc: middlewareAPIResponse.dataSrc,
        bStartDate: StringUtils.formatCalendar(new Calendar(new Date(middlewareAPIResponse.bStartDate)), 'yyyy-MM-dd'),
        bEndDate: StringUtils.formatCalendar(new Calendar(new Date(middlewareAPIResponse.bEndDate)), 'yyyy-MM-dd'),
        subNum: externalProfile.source ? externalProfile.custom_attributes.AARP_Subscriber_ID : middlewareAPIResponse.subNum,
        lastName: externalProfile.family_name,
        firstName: externalProfile.given_name,
        doB: StringUtils.formatCalendar(new Calendar(new Date(externalProfile.custom_attributes.birthdate)), 'yyyy-MM-dd'),
        address: middlewareAPIResponse.address,
        city: middlewareAPIResponse.city,
        state: middlewareAPIResponse.state,
        zipCode: middlewareAPIResponse.zipCode,
        lookup: middlewareAPIResponse.lookup,
        email: externalProfile.email
    };
    if (middlewareAPIResponse.subNum) {
        session.privacy.subscriberId = middlewareAPIResponse.subNum;
    }
    var eligibilityMember = require('*/cartridge/scripts/services/EligibilityMemberService');
    var eligibilityMemberAPI = eligibilityMember.call(eligibilityRequest, false);
    if (eligibilityMemberAPI.error === 401) {
        eligibilityMemberAPI = eligibilityMember.call(eligibilityRequest, true);
    }
    var eligibilityMemberAPIResponse = eligibilityMemberAPI.object;
    return eligibilityMemberAPIResponse;
}

/**
 * helper for getting the customer details
 * @param {Object} externalProfile - Object
 * @returns {Object} Request body with all needed details
 */
function getCustomerDetails(externalProfile) {
    var allowMiddlewareAPIWithSubsID = preferences.allowMiddlewareAPIWithSubsID;
    var isSubsID = externalProfile.custom_attributes.subscriber_id !== null;
    if (!allowMiddlewareAPIWithSubsID) {
        isSubsID = true;
    }
    var middlewareServiceCallObj = '';
    if ((externalProfile.custom_attributes && isSubsID
        && externalProfile.custom_attributes.Pricebook_Id === null
        && externalProfile.custom_attributes.Opportunity_Id === null
        && (externalProfile.custom_attributes.eligibilityRefId === null || externalProfile.custom_attributes.eligibilityRefId === ''))
        || (externalProfile.fromHealthPlan && externalProfile.custom_attributes.subscriber_id !== null)) {
        middlewareServiceCallObj = getMiddleware(externalProfile);
        if (middlewareServiceCallObj === '') {
            return '';
        }

        var eligibilityServiceCallObj = getEligibility(externalProfile, middlewareServiceCallObj);
        if (eligibilityServiceCallObj) {
            if (eligibilityServiceCallObj.Opportunity_Id !== null) {
                session.privacy.customerType = 'UHCVerified';
            } else {
                session.privacy.customerType = 'UHCNotVerified';
            }
            session.privacy.pricebook = eligibilityServiceCallObj.Pricebook_Id;
            session.privacy.opportunityId = eligibilityServiceCallObj.Opportunity_Id;
            session.privacy.customerDetails = JSON.stringify(eligibilityServiceCallObj);
        }
        Logger.debug('Customer Details {0}', JSON.stringify(session.privacy.customerDetails));
    }
    return '';
}

/**
 * helper for the displaying Registration Model
 */
function displayRegistrationModel() {
    var utilHelpers = require('*/cartridge/scripts/helpers/utilHelpers');
    var benefitsType;

    if (session.privacy.customerType === 'UHCVerified') {
        benefitsType = 'benefitsVerified';
    } else if (session.privacy.customerType === 'UHCNotVerified') {
        benefitsType = 'benefitsNotVerified';
    } else {
        benefitsType = 'memberDataOnly';
    }
    utilHelpers.setCookie('registrationType', benefitsType);
    return;
}
/**
 * helper for the updating the PriceBook
 */
function updatePriceBook() {
    if (session.privacy.customerType === 'UHCVerified' && session.privacy.pricebook && session.privacy.pricebook !== null) {
        var priceBookMgr = require('dw/catalog/PriceBookMgr');
        var userPriceBook = priceBookMgr.getPriceBook(session.privacy.pricebook);
        if (userPriceBook) {
            priceBookMgr.setApplicablePriceBooks([userPriceBook]);
        }
    }
    return;
}

module.exports = {
    getCustomerDetails: getCustomerDetails,
    getMiddleware: getMiddleware,
    getEligibility: getEligibility,
    displayRegistrationModel: displayRegistrationModel,
    updatePriceBook: updatePriceBook
};
