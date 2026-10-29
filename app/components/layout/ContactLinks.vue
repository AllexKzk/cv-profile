<script setup lang="ts">
const cv = useCv()
const links = useContactLinks(() => cv.value.contacts)
</script>

<template>
  <nav
    class="contacts"
    :aria-label="$t('topbar.contacts.title')"
  >
    <Tooltip
      v-for="link in links"
      :key="link.id"
    >
      <TooltipTrigger as-child>
        <Button
          as-child
          variant="ghost"
          size="icon"
        >
          <a
            :href="link.href"
            :aria-label="link.label"
            :target="link.external ? '_blank' : undefined"
            :rel="link.external ? 'noopener noreferrer' : undefined"
          >
            <component :is="link.icon" />
          </a>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{{ link.label }}</TooltipContent>
    </Tooltip>
  </nav>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.contacts {
  @apply flex items-center gap-1;
}
</style>
