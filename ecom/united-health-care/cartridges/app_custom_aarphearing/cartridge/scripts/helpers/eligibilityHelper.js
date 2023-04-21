'use strict';

var base = module.superModule;

var Logger = require('dw/system/Logger');

/**
 * helper for the setting the aarp customer type
 */
function setAARPCustomerType() {
    if (session.privacy.AARP_Member === 'true') {
        session.privacy.customerType = 'AARPVerified';
    } else if (session.privacy.AARP_Member === 'false') {
        session.privacy.customerType = 'AARPNotVerified';
    } else {
        session.privacy.customerType = 'AARPNoData';
    }
    return;
}
/**
 * helper for getting the customer details
 * @param {Object} externalProfile - Object
 * @returns {Object} Request body with all needed details
 */
function getCustomerDetails(externalProfile) {
    var middlewareServiceCallObj = '';
    if ((externalProfile.custom_attributes && externalProfile.custom_attributes.subscriber_id !== null
        && externalProfile.custom_attributes.Pricebook_Id === null
        && externalProfile.custom_attributes.Opportunity_Id === null
        && (externalProfile.custom_attributes.eligibilityRefId === null || externalProfile.custom_attributes.eligibilityRefId === ''))
        || (externalProfile.fromHealthPlan && externalProfile.custom_attributes.subscriber_id !== null)) {
        // first condition is for the IDP login when subscriber id is not equal to null
        // Second condition is for the health plan model which is from the PLP, PDP, covearge page
        // here we need to make a middleware call and if from middleware we will get lookup then we need to make
        // custom eligibilty api call
        middlewareServiceCallObj = base.getMiddleware(externalProfile);
        if (middlewareServiceCallObj === '') {
            return '';
        }
        // this call is only for the health plan model where user is entering there subscriber id
        var eligibilityServiceCallObj = base.getEligibility(externalProfile, middlewareServiceCallObj);
        if (eligibilityServiceCallObj || !empty(eligibilityServiceCallObj)) {
            if (eligibilityServiceCallObj.Opportunity_Id !== null && eligibilityServiceCallObj.Pricebook_Id !== null) {
                session.privacy.subscriberId = externalProfile.custom_attributes.subscriber_id;
                session.privacy.customerType = 'UHCVerified';
                session.privacy.pricebook = eligibilityServiceCallObj.Pricebook_Id;
                session.privacy.opportunityId = eligibilityServiceCallObj.Opportunity_Id;
                session.privacy.customerDetails = JSON.stringify(eligibilityServiceCallObj);
            } else if (externalProfile.custom_attributes.AARP_Subscriber_ID !== null
                && externalProfile.custom_attributes.AARP_Member && externalProfile.custom_attributes.AARP_Member === 'false') {
                // eslint-disable-next-line no-param-reassign
                externalProfile.source = 1;
                middlewareServiceCallObj = base.getMiddleware(externalProfile);
                if (middlewareServiceCallObj && ((middlewareServiceCallObj.code === '1') || (middlewareServiceCallObj.AARP_Member !== 'true'))) {
                    middlewareServiceCallObj.error = true;
                    return middlewareServiceCallObj;
                }
                session.privacy.customerDetails = JSON.stringify(middlewareServiceCallObj);
                session.privacy.AARP_Member = middlewareServiceCallObj.AARP_Member;
                setAARPCustomerType();
            }
        }
        Logger.debug('Customer Details {0}', JSON.stringify(session.privacy.customerDetails));
        return '';
    } else if ((externalProfile.custom_attributes && externalProfile.custom_attributes.subscriber_id === null
        && externalProfile.custom_attributes.AARP_Subscriber_ID !== null
        && externalProfile.custom_attributes.AARP_Member && externalProfile.custom_attributes.AARP_Member === 'false')
        || (externalProfile.fromCart && externalProfile.custom_attributes.AARP_Subscriber_ID !== null)) {
        // first condition is for the IDP login and second condition is for the Cart page
        // here we just need to make middleware call
        // eslint-disable-next-line no-param-reassign
        externalProfile.source = 1;
        middlewareServiceCallObj = base.getMiddleware(externalProfile);
        // if from the middleware we are getting success response then storing the response in the session
        if (middlewareServiceCallObj && ((middlewareServiceCallObj.code === '1') || (middlewareServiceCallObj.AARP_Member !== 'true'))) {
            middlewareServiceCallObj.error = true;
            return middlewareServiceCallObj;
        }
        session.privacy.customerDetails = JSON.stringify(middlewareServiceCallObj);
        session.privacy.AARP_Member = middlewareServiceCallObj.AARP_Member;
        setAARPCustomerType();
        return 'success';
    }
    return '';
}

/**
 * helper for the displaying Registration Model
 */
function displayRegistrationModel() {
    var utilHelpers = require('*/cartridge/scripts/helpers/utilHelpers');
    var benefitsType;
    if (session.privacy.customerType === 'AARPVerified') {
        benefitsType = 'benefitsVerified';
    } else if (session.privacy.customerType === 'AARPNotVerified') {
        benefitsType = 'benefitsNotVerified';
    } else {
        benefitsType = 'memberDataOnly';
    }
    utilHelpers.setCookie('registrationType', benefitsType);
    return;
}

base.getCustomerDetails = getCustomerDetails;
base.setAARPCustomerType = setAARPCustomerType;
base.displayRegistrationModel = displayRegistrationModel;
module.exports = base;
