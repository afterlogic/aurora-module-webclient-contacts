<template>
  <div class="">
    
  </div>
</template>

<script>
export default {
  name: 'ContactsToolbar',
  
  props: {
    caption: { type: String, default: '' },
  },
  actions: {
    newContactCommand() {
      console.log('newContactCommand');
    }
  }
};
</script>
