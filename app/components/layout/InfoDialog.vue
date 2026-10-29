<script setup lang="ts">
import { Info } from '@lucide/vue'
import GithubIcon from '~/components/icons/GithubIcon.vue'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

const REPOSITORY_URL = 'https://github.com/AllexKzk/cv-profile'
</script>

<template>
  <Dialog>
    <Tooltip>
      <TooltipTrigger as-child>
        <DialogTrigger as-child>
          <Button
            variant="ghost"
            size="icon"
            :aria-label="$t('about.open')"
          >
            <Info />
          </Button>
        </DialogTrigger>
      </TooltipTrigger>
      <TooltipContent>{{ $t('about.open') }}</TooltipContent>
    </Tooltip>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{{ $t('about.title') }}</DialogTitle>
        <DialogDescription>{{ $t('about.description') }}</DialogDescription>
      </DialogHeader>
      <div class="body">
        <section class="section">
          <h3 class="heading">
            {{ $t('about.howTitle') }}
          </h3>
          <p>{{ $t('about.how') }}</p>
        </section>
        <section class="section">
          <h3 class="heading">
            {{ $t('about.privacyTitle') }}
          </h3>
          <p>{{ $t('about.privacy') }}</p>
        </section>
        <a
          class="link"
          :href="REPOSITORY_URL"
          target="_blank"
          rel="noopener noreferrer"
        >
          <GithubIcon class="icon" />
          {{ $t('about.source') }}
        </a>
      </div>
    </DialogContent>
  </Dialog>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.body {
  @apply flex flex-col gap-4 text-muted-foreground;
}

.section {
  @apply flex flex-col gap-1;
}

.heading {
  @apply font-medium text-foreground;
}

.icon {
  @apply size-4;
}

.link {
  @apply inline-flex items-center gap-2 self-start font-medium text-foreground underline-offset-4 hover:underline;
}
</style>
