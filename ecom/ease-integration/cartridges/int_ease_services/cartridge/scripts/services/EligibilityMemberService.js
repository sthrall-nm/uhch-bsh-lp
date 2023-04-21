/* eslint-disable no-undef */
/* eslint-disable valid-jsdoc */
'use strict';

var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');
var Logger = require('dw/system/Logger');
var AuthToken = require('*/cartridge/scripts/services/EaseAuthService');
/**
 * Create Request for Lead Creation for SF Ease
 * @returns {dw.svc.HTTPService} HTTP service object
 */
function getEligibilityMemberDetails() {
    return LocalServiceRegistry.createService('ease.http.eligibility.get', {
        /**
         * @param {dw.svc.HTTPService} svc
         * @param {object} request object from contactus form
         * @param {boolean} requestType - requestType
         * @returns {string} request body
         */
        createRequest: function (svc, request, requestType) {
            svc.addHeader('Content-Type', 'application/json');
            svc.addHeader('Accept', 'application/json');
            svc.setRequestMethod('POST');
            var authToken = new AuthToken();
            var token = authToken.getValidToken(requestType);
            var bearerToken = 'Bearer ' + token.access_token;
            svc.addHeader('Authorization', bearerToken);
            return JSON.stringify(request);
        },
        /**
         *
         * @param {dw.svc.HTTPService} svc
         * @param {dw.net.HTTPClient} client
         * @returns {{responseObj: Object, isError: boolean, isValidJSON: boolean, errorText: string}}
         */
        parseResponse: function (svc, client) {
            var result;
            var response = {};

            try {
                if (client.statusMessage === 'OK') {
                    response = JSON.parse(client.text);
                } else {
                    response.error = true;
                    response.errorMessage = result.errors[0].message;
                }
            } catch (e) {
                response = client.text;
                Logger.error('Error while fetching the SF Ease Lead Service ' + e);
            }
            return response;
        },
        /**
         *
         * @param {dw.svc.HTTPService} svc
         * @param {object} contactInfo
         * @returns {{text: string, statusMessage: string, statusCode: number}}
         */
        // eslint-disable-next-line no-unused-vars
        mockCall: function (svc, contactInfo) {
            var response = {
                "Pricebook_Id":"PB-0001",
                "insuracePlan_Id":"a0R6s000000i2D5",
                "MA_Type":"Yes",
                "lookup":"BFocus-00008-Test2021",
                "benefit_frequency":1,
                "hearing_aid_covered":2,
                "benefit_max":2000.00,
                "benefit_max_per_year":"Yes",
                "deductible":"N/A",
                "coinsurance":10.00,
                "opportunityId" :"12345678766"
           };
            return {
                statusCode: 200,
                statusMessage: 'Success',
                text: JSON.stringify(response)
            };
        }
    });
}

// execute and return the created instance
module.exports = getEligibilityMemberDetails();
