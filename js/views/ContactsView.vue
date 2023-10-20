<template>
  <div class="panels">
    <div class="panel left_panel groups_panel" data-splitter="groups">
      <div class="panel_content">
        <BigButton></BigButton>
        {{ labelDay }}
        <div class="middle_bar">
          <StoragesList></StoragesList>
          <!-- ko_ template: { name: '%ModuleName%_GroupsView', data: $data} --><!-- ko_ -->
        </div>
      </div>
    </div>
    <div class="panel center_panel contacts_panel">
      <div class="panel_content">
        <ContactsToolbar></ContactsToolbar>
        <!-- ko_ template: { name: '%ModuleName%_Toolbar_ContactsView'} --><!-- ko_ -->
        <div class="middle_bar">
          <ContactsList></ContactsList>
          <!-- ko_ template: { name: '%ModuleName%_ContactsView', data: $data} --><!-- ko_ -->
        </div>
      </div>
    </div>

    <div class="panel item_viewer contact_viewer" data-bind_="css: 'contact_' + (selectedContact() && selectedContact().storage())">
      <div class="panel_content">
        <div class="middle_bar contact" data-bind_="visible: selectedContact() && !selectedContact().edited(), with: selectedContact">
          <!-- ko_ template: { name: '%ModuleName%_ContactView', data: $data} --><!-- ko_ -->
        </div>

        <div class="middle_bar edit_contact" data-bind_="visible: selectedContact() && selectedContact().edited(), with: selectedContact" id="selenium_contacts_edit_form">
          <!-- ko_ template: { name: '%ModuleName%_EditContactView', data: $data } --><!-- ko_ -->
        </div>

        <div class="middle_bar group" data-bind_="visible: selectedGroup() && !selectedGroup().edited(), with: selectedGroup">
          <!-- ko_ template: { name: '%ModuleName%_GroupView', data: $data } --><!-- ko_ -->
        </div>

        <div class="middle_bar edit_group" data-bind_="visible: selectedGroup() && selectedGroup().edited(), with: selectedGroup" id="selenium_contacts_edit_group_form">
          <!-- ko_ template: { name: '%ModuleName%_EditGroupView', data: $data } --><!-- ko_ -->
        </div>

        <div class="middle_bar import" data-bind_="visible: oImportView.visibility()">
          <!-- ko_ template: { name: oImportView.ViewTemplate, data: oImportView } --><!-- ko_ -->
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import StoragesList from './StoragesList.vue'
import ContactsList from './ContactsList.vue'
import GroupsList from './GroupsList.vue'
import BigButton from '../components/BigButton.vue'
import ContactsToolbar from '../components/ContactsToolbar.vue'

const TextUtils = require('%PathToCoreWebclientModule%/js/utils/Text.js')

export default {
  name: 'App',

  components: {
    StoragesList,
    ContactsList,
    GroupsList,
    BigButton,
    ContactsToolbar
  },

  props: {
    caption: { type: String, default: '' },
    icon: { type: String, default: '' },
    value: { type: String, default: '' },
    itemActionIcon: { type: String, default: '' }
  },

  data: () => ({
    saving: false,
    labelDay: TextUtils.i18n('COREWEBCLIENT/LABEL_DAY')
  }),
};
</script>



