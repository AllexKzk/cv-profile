<script setup lang="ts">
import { CircleAlert, Loader2 } from '@lucide/vue'
import type { BriefFit, VacancyBrief } from '#shared/interview/brief'
import { LEAD_ERROR_CODES, LEAD_LIMITS } from '#shared/lead'
import type { LeadErrorCode } from '#shared/lead'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

// Lead form: sent to the candidate's Telegram only by this explicit click. The trigger is the slot.
const props = defineProps<{
  // toolCallId of the brief: the confirmation part points back at it
  source: string
  brief: VacancyBrief
  fit: BriefFit
}>()

const { locale } = useI18n()
const cv = useCv()
const answer = useLocalAnswer()

const open = ref(false)
const form = reactive({ name: '', contact: '', company: '', comment: '', website: '' })
const sending = ref(false)
const error = ref<LeadErrorCode | 'network'>()

const canSend = computed(() => !sending.value && form.contact.trim().length >= 3)
// Retrying will not help: the visitor writes directly instead
const final = computed(() => error.value === 'rate_limit' || error.value === 'unavailable')

function errorCode(data: unknown): LeadErrorCode | 'network' {
  const code = (data as { code?: unknown } | undefined)?.code
  return (LEAD_ERROR_CODES as readonly unknown[]).includes(code) ? code as LeadErrorCode : 'network'
}

async function submit() {
  if (!canSend.value) return
  sending.value = true
  error.value = undefined
  try {
    await $fetch('/api/lead', {
      method: 'POST',
      body: { ...form, brief: props.brief, fit: props.fit, locale: locale.value },
    })
    open.value = false
    answer([{ type: 'data-lead', data: { source: props.source } }])
  }
  catch (failure) {
    error.value = errorCode((failure as { data?: unknown }).data)
  }
  finally {
    sending.value = false
  }
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogTrigger as-child>
      <slot />
    </DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{{ $t('lead.title', { name: cv.person.name }) }}</DialogTitle>
        <DialogDescription>{{ $t('lead.description') }}</DialogDescription>
      </DialogHeader>
      <form
        class="form"
        @submit.prevent="submit"
      >
        <div class="field">
          <Label for="lead-contact">{{ $t('lead.contact') }} *</Label>
          <Input
            id="lead-contact"
            v-model="form.contact"
            required
            :maxlength="LEAD_LIMITS.contact"
            :placeholder="$t('lead.contactHint')"
            autocomplete="email"
          />
        </div>
        <div class="field">
          <Label for="lead-name">{{ $t('lead.name') }}</Label>
          <Input
            id="lead-name"
            v-model="form.name"
            :maxlength="LEAD_LIMITS.name"
            autocomplete="name"
          />
        </div>
        <div class="field">
          <Label for="lead-company">{{ $t('lead.company') }}</Label>
          <Input
            id="lead-company"
            v-model="form.company"
            :maxlength="LEAD_LIMITS.company"
            autocomplete="organization"
          />
        </div>
        <div class="field">
          <Label for="lead-comment">{{ $t('lead.comment') }}</Label>
          <Textarea
            id="lead-comment"
            v-model="form.comment"
            :maxlength="LEAD_LIMITS.comment"
            rows="3"
          />
        </div>
        <!-- Honeypot: off screen and out of the tab order, only bots fill it in -->
        <input
          v-model="form.website"
          class="trap"
          type="text"
          name="website"
          tabindex="-1"
          autocomplete="off"
          aria-hidden="true"
        >

        <p
          v-if="error"
          class="error"
          role="alert"
        >
          <CircleAlert class="error-icon" />
          <span>
            {{ $t(`lead.error.${error}`) }}
            <a
              :href="cv.contacts.telegram"
              target="_blank"
              rel="noopener noreferrer"
              class="link"
            >{{ $t('lead.writeDirect') }}</a>
          </span>
        </p>

        <DialogFooter>
          <Button
            type="submit"
            :disabled="!canSend || final"
          >
            <Loader2
              v-if="sending"
              class="spinner"
            />
            {{ $t('lead.submit') }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.form {
  @apply flex flex-col gap-4;
}

.field {
  @apply flex flex-col gap-2;
}

.trap {
  @apply absolute -left-[9999px] size-px opacity-0;
}

.error {
  @apply flex items-start gap-2 text-sm text-destructive;
}

.error-icon {
  @apply mt-0.5 size-4 shrink-0;
}

.link {
  @apply underline underline-offset-4;
}

.spinner {
  @apply animate-spin;
}
</style>
