'use strict';

var
	_ = require('underscore'),
	$ = require('jquery'),
	
	AddressUtils = require('%PathToCoreWebclientModule%/js/utils/Address.js'),
	Types = require('%PathToCoreWebclientModule%/js/utils/Types.js'),
	
	Ajax = require('modules/%ModuleName%/js/Ajax.js')
;

/**
 * @param {object} oRequest
 * @param {function} fResponse
 * @param {string} sExceptEmail
 * @param {boolean} bGlobalOnly
 */
function Callback(oRequest, fResponse, sExceptEmail, bGlobalOnly)
{
	var
		sTerm = oRequest.term,
		oParameters = {
			'Search': sTerm,
			'Storage': bGlobalOnly ? 'global' : 'all'
		}
	;

	Ajax.send('GetSuggestions', oParameters, function (oResponse) {
		var aList = [];
		if (oResponse && oResponse.Result && oResponse.Result.List)
		{
			aList = _.map(oResponse.Result.List, function (oItem) {
				return oItem && oItem.Email && oItem.Email !== sExceptEmail ?
				{
					value: (oItem.Name && 0 < $.trim(oItem.Name).length) ? (oItem.ForSharedToAll ? oItem.Name : ('"' + oItem.Name + '" <' + oItem.Email + '>')) : oItem.Email,
					name: oItem.Name,
					email: oItem.Email,
					frequency: oItem.Frequency,
					id: oItem.Id,
					global: oItem.Storage === 'global',
					sharedToAll: oItem.Storage === 'shared'
				} :
				null;
			});

			aList = _.sortBy(_.compact(aList), function(oItem){
				return oItem.frequency;
			}).reverse();
		}

		fResponse(aList);

	});
}

/**
 * @param {object} oRequest
 * @param {function} fResponse
 */
function ComposeCallback(oRequest, fResponse)
{
	var
		sTerm = oRequest.term,
		oParameters = { 'Search': sTerm }
	;

	Ajax.send('GetSuggestions', oParameters, function (oResponse) {
		var aList = [];
		if (oResponse && oResponse.Result && oResponse.Result.List)
		{
			aList = _.map(oResponse.Result.List, function (oItem) {
				var
					sLabel = '',
					sValue = oItem.Email
				;

				if (oItem.IsGroup)
				{
					if (oItem.Name && 0 < $.trim(oItem.Name).length)
					{
						sLabel = '"' + oItem.Name + '" (' + oItem.Email + ')';
					}
					else
					{
						sLabel = '(' + oItem.Email + ')';
					}
				}
				else
				{
					sLabel = AddressUtils.getFullEmail(oItem.Name, oItem.Email);
					sValue = sLabel;
				}

				return {
					'label': sLabel,
					'value': sValue,
					'frequency': oItem.Frequency,
					'id': oItem.Id,
					'global': oItem.Storage === 'global',
					'sharedToAll': oItem.Storage === 'shared'
				};
			});

			aList = _.sortBy(_.compact(aList), function(oItem) {
				return oItem.frequency;
			}).reverse();
		}

		fResponse(aList);

	});
}

/**
 * @param {object} oRequest
 * @param {function} fResponse
 */
function PhoneCallback(oRequest, fResponse)
{
	var
		sTerm = $.trim(oRequest.term),
		oParameters = {
			'Search': sTerm,
			'PhoneOnly': true
		}
	;

	if ('' !== sTerm)
	{
		Ajax.send('GetSuggestions', oParameters, function (oResponse) {
			var aList = [];

			if (oResponse && oResponse.Result && oResponse.Result.List)
			{
				_.each(oResponse.Result.List, function (oItem) {
					_.each(oItem.Phones, function (sPhone, sKey) {
						aList.push({
							label: oItem.Name !== '' ? oItem.Name + ' ' + '<' + oItem.Email + '> ' + sPhone : oItem.Email + ' ' + sPhone,
							value: sPhone,
							frequency: oItem.Frequency
						});
					});
				});

				aList = _.sortBy(_.compact(aList), function(num){ return -(num.frequency); });
			}
			
			fResponse(aList);
		});
	}
}

/**
 * @param {Object} oContact
 */
function DeleteHandler(oContact)
{
	Ajax.send('DeleteSuggestion', { 'IdContact': oContact.id });
}

function RequestUserByPhone(sNumber, fCallBack, oContext)
{
	oParameters = {
		'Search': sNumber,
		'PhoneOnly': true
	};
	
	Ajax.send('GetSuggestions', oParameters, function (oResponse) {
		var
			oResult = oResponse.Result,
			sUser = '',
			oUser = Types.isNonEmptyArray(oResult.List) ? oResult.List[0] : null
		;
		
		if (oUser && oUser.Phones)
		{
			$.each(oUser.Phones, function (sKey, sUserPhone) {
				var
					regExp = /[()\s_\-]/g,
					sCleanedPhone = (sNumber.replace(regExp, '')),
					sCleanedUserPhone = (sUserPhone.replace(regExp, ''))
				;

				if (sCleanedPhone === sCleanedUserPhone)
				{
					sUser = oUser.Name === '' ? oUser.Email + ' ' + sUserPhone : oUser.Name + ' ' + sUserPhone;
					return false;
				}
			});
		}
		
		fCallBack.call(oContext, sUser);
	});
}

module.exports = {
	callback: Callback,
	composeCallback: ComposeCallback,
	phoneCallback: PhoneCallback,
	deleteHandler: DeleteHandler,
	requestUserByPhone: RequestUserByPhone
};
