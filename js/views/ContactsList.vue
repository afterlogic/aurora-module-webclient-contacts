<template>
  <div>TEST VUE</div>
</template>

<script>

export default {
  name: 'App',
  props: {
    caption: { type: String, default: '' },
    icon: { type: String, default: '' },
    value: { type: String, default: '' },
    itemActionIcon: { type: String, default: '' }
  }
};
</script>



