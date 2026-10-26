<script lang="ts" setup>
import { ref } from 'vue';

import { Settings } from '@vben/icons';

import { VbenIconButton } from '@vben-core/shadcn-ui';

import Preferences from './preferences.vue';

const emit = defineEmits<{ clearPreferencesAndLogout: [] }>();

function clearPreferencesAndLogout() {
  emit('clearPreferencesAndLogout');
}

// 对齐官方 main 分支修复：v5.7.0 的 slot 触发器缺少点击打开抽屉的绑定
const preferencesRef = ref<InstanceType<typeof Preferences> | null>(null);
</script>
<template>
  <Preferences
    ref="preferencesRef"
    @clear-preferences-and-logout="clearPreferencesAndLogout"
  >
    <VbenIconButton
      class="hover:animate-[shrink_0.3s_ease-in-out]"
      @click="preferencesRef?.open()"
    >
      <Settings class="size-4 text-foreground" />
    </VbenIconButton>
  </Preferences>
</template>
