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
	AddressBooks: [],
	Storages: [],
	DefaultStorage: 'personal',
	AllowAddressBooksManagement: false,
	ContactsSortBy: {},

	ImportExportFormats: [],
	SaveVcfServerModuleName: '',

	EContactsPrimaryEmail: {},
	EContactsPrimaryPhone: {},
	EContactsPrimaryAddress: {},
	EContactSortField: {},
	
	/**
	 * Initializes settings from AppData object sections.
	 * 
	 * @param {Object} oAppData Object contained modules settings.
	 */
	init: function (oAppData)
	{
		var oAppDataSection = oAppData[this.ServerModuleName];
		
		if (!_.isEmpty(oAppDataSection))
		{
			this.ContactsPerPage = Types.pPositiveInt(oAppDataSection.ContactsPerPage, this.ContactsPerPage);
			this.ImportContactsLink = Types.pString(oAppDataSection.ImportContactsLink, this.ImportContactsLink);

			var storages = Types.pArray(oAppDataSection.Storages, this.Storages);
			this.AddressBooks = _.filter(storages, function (storage) {
				return storage && storage.Id && _.indexOf(['personal', 'collected', 'shared', 'team'], storage.Id) === -1;
			});
			this.Storages = _.map(storages, function (storage) {
				return storage.Id || storage;
			});
			if (this.Storages.length > 0)
			{
				this.Storages.push('all');
				this.Storages.push('group');
			}
			this.AllowAddressBooksManagement = Types.pBool(oAppDataSection.AllowAddressBooksManagement, this.AllowAddressBooksManagement);
			
			this.ImportExportFormats = Types.pArray(oAppDataSection.ImportExportFormats, this.ImportExportFormats);
			this.SaveVcfServerModuleName = Types.pString(oAppDataSection.SaveVcfServerModuleName, this.SaveVcfServerModuleName);
			
			this.EContactsPrimaryEmail = Types.pObject(oAppDataSection.PrimaryEmail);
			this.EContactsPrimaryPhone = Types.pObject(oAppDataSection.PrimaryPhone);
			this.EContactsPrimaryAddress = Types.pObject(oAppDataSection.PrimaryAddress);
			this.EContactSortField = Types.pObject(oAppDataSection.SortField);
			this.ContactsSortBy = this.getSortConfig(Types.pObject(oAppDataSection.ContactsSortBy));

			console.log('ContactsSortBy', this.ContactsSortBy);
		}
	},
	
	/**
	 * Updates contacts per page after saving to server.
	 * 
	 * @param {number} iContactsPerPage
	 */
	update: function (iContactsPerPage)
	{
		this.ContactsPerPage = iContactsPerPage;
	},

	getSortConfig: function (config)
	{
		return {
			Allow: config.Allow ? true : false,
			DisplayOptions: config.DisplayOptions || [],
			DefaultSortBy: config.DefaultSortBy && config.Allow ? config.DefaultSortBy : 'Name',
			DefaultSortOrder: config.DefaultSortOrder && config.Allow ? config.DefaultSortOrder : 'Desc'
		};
	}
};
