'use strict';

var
	_ = require('underscore'),
	
	Types = require('%PathToCoreWebclientModule%/js/utils/Types.js')
;

module.exports = {
	ServerModuleName: 'Contacts',
	HashModuleName: 'contacts',
	
	ContactsPerPage: 20,
	ImportContactsLink: '',
	Storages: ['personal', 'team', 'shared'],
	DefaultStorage: 'personal',
	ImportExportFormats: [],
	
	init: function (oAppDataSection)
	{
		if (oAppDataSection)
		{
			this.ContactsPerPage = Types.pInt(oAppDataSection.ContactsPerPage);
			this.ImportContactsLink = Types.pString(oAppDataSection.ImportContactsLink);
			this.Storages = _.isArray(oAppDataSection.Storages) ? oAppDataSection.Storages : [];
			this.Storages.push('all');
			this.Storages.push('group');
			
			this.EContactsPrimaryEmail = oAppDataSection.PrimaryEmail;
			this.EContactsPrimaryPhone = oAppDataSection.PrimaryPhone;
			this.EContactsPrimaryAddress = oAppDataSection.PrimaryAddress;
			this.EContactSortField = oAppDataSection.SortField;
			this.ImportExportFormats = oAppDataSection.ImportExportFormats;
			
			this.SaveVcfServerModuleName = oAppDataSection.SaveVcfServerModuleName;
		}
	},
	
	update: function (iContactsPerPage)
	{
		this.ContactsPerPage = iContactsPerPage;
	}
};