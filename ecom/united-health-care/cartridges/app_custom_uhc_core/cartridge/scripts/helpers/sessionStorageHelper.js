'use strict';

/**
 * helper for setting Customer detail In Session
 * @param {Object} externalProfile - Object
 */
function setCustomerdetailInSessionLogin(externalProfile) {
    if (externalProfile.custom_attributes.birthdate && externalProfile.custom_attributes.birthdate !== null) {
        session.privacy.profilebirthdate = new Date(externalProfile.custom_attributes.birthdate);
    }
    if (externalProfile.custom_attributes.AARP_Subscriber_ID && externalProfile.custom_attributes.AARP_Subscriber_ID !== null) {
        session.privacy.AARPSubscriberId = externalProfile.custom_attributes.AARP_Subscriber_ID;
    }
    if (externalProfile.custom_attributes.AARP_Member && externalProfile.custom_attributes.AARP_Member !== null) {
        session.privacy.AARP_Member = externalProfile.custom_attributes.AARP_Member;
    }
    if (externalProfile.custom_attributes.subscriber_id && externalProfile.custom_attributes.subscriber_id !== null) {
        session.privacy.subscriberId = externalProfile.custom_attributes.subscriber_id;
    }
    if (externalProfile.custom_attributes.hearing_test_created_date && externalProfile.custom_attributes.hearing_test_created_date !== null) {
        session.privacy.hearingTestDate = externalProfile.custom_attributes.hearing_test_created_date;
    }
    if (externalProfile.custom_attributes.Pricebook_Id && externalProfile.custom_attributes.Pricebook_Id !== null) {
        session.privacy.pricebook = externalProfile.custom_attributes.Pricebook_Id;
    }
    if (externalProfile.custom_attributes.Opportunity_Id && externalProfile.custom_attributes.Opportunity_Id !== null) {
        session.privacy.opportunityId = externalProfile.custom_attributes.Opportunity_Id;
    }
    if (externalProfile.custom_attributes.communication_Instruction && externalProfile.custom_attributes.communication_Instruction !== null) {
        session.privacy.communicationInstruction = externalProfile.custom_attributes.communication_Instruction;
    }

    session.privacy.customerDetails = JSON.stringify(externalProfile.custom_attributes);
}

/**
 * helper for setting Customer detail In Session
 * @param {req} req - Object
 */
function setCustomerType(req) {
    if (session.privacy.subscriberId !== null && session.privacy.opportunityId && session.privacy.opportunityId !== null) {
        req.session.privacyCache.set('customerType', 'UHCVerified');
    } else if (session.privacy.subscriberId !== null) {
        req.session.privacyCache.set('customerType', 'UHCNotVerified');
    } else {
        req.session.privacyCache.set('customerType', 'UHCNoData');
    }
}

module.exports = {
    setCustomerdetailInSessionLogin: setCustomerdetailInSessionLogin,
    setCustomerType: setCustomerType
};
