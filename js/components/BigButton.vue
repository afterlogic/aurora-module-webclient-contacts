<template>
  <div class="buttons big_single_button">
    <span class="button" id="selenium_contacts_new_button"
        data-bind_="i18n: {'key': '%MODULENAME%/ACTION_NEW_CONTACT'}, command: newContactCommand"
        @click="newContactCommand"
        >{{ label }}</span>
  </div>
</template>

<script>
const TextUtils = require('%PathToCoreWebclientModule%/js/utils/Text.js')

export default {
  name: 'BigButton',
  
  props: {
    label: { type: String, default: TextUtils.i18n('%MODULENAME%/ACTION_NEW_CONTACT') },
  },

  actions: {
    newContactCommand() {
      console.log('newContactCommand');
    }
  }
};
</script>
