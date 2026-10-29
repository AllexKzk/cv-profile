import { mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent, h } from 'vue'
import type { Component } from 'vue'
import { TooltipProvider } from '~/components/ui/tooltip'

// Mounts a component inside the providers that layouts/default.vue gives it in the app
export function mountInApp(component: Component, props: Record<string, unknown> = {}) {
  const Wrapper = defineComponent({
    setup: () => () => h(TooltipProvider, null, () => h(component, props)),
  })
  return mountSuspended(Wrapper)
}
