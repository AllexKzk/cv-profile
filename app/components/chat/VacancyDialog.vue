<script setup lang="ts">
import { FileUp } from '@lucide/vue'
import { useDropZone } from '@vueuse/core'
import { VACANCY_LIMITS } from '#shared/vacancy'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'

// "Upload a vacancy": a file (picked or dropped) or pasted text. Either ends as the chip in the input.
const open = useVacancyDialog()
const { attachFile, attachText } = useVacancyUpload()

const text = ref('')
const tooShort = ref(false)

function pick(file: File) {
  open.value = false
  attachFile(file)
}

const picker = useVacancyPicker(pick)

const dropZone = useTemplateRef<HTMLElement>('dropZone')
const { isOverDropZone } = useDropZone(dropZone, {
  multiple: false,
  onDrop: (files) => {
    const file = files?.[0]
    if (file) pick(file)
  },
})

function submitText() {
  tooShort.value = !attachText(text.value)
  if (tooShort.value) return
  open.value = false
}

// Every opening starts clean
watch(open, (isOpen) => {
  if (!isOpen) return
  text.value = ''
  tooShort.value = false
})
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent class="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{{ $t('vacancy.dialog.title') }}</DialogTitle>
        <DialogDescription>{{ $t('vacancy.dialog.description') }}</DialogDescription>
      </DialogHeader>
      <div
        ref="dropZone"
        class="drop"
        :class="{ over: isOverDropZone }"
      >
        <FileUp class="drop-icon" />
        <Button
          type="button"
          variant="outline"
          @click="picker.open()"
        >
          {{ $t('vacancy.dialog.file') }}
        </Button>
        <p class="hint">
          {{ $t('vacancy.dialog.dropHint') }}
        </p>
      </div>
      <form
        class="paste"
        @submit.prevent="submitText"
      >
        <label
          class="label"
          for="vacancy-text"
        >{{ $t('vacancy.dialog.or') }}</label>
        <Textarea
          id="vacancy-text"
          v-model="text"
          class="max-h-60 min-h-28"
          :maxlength="VACANCY_LIMITS.chars"
          :placeholder="$t('vacancy.dialog.placeholder')"
          :aria-invalid="tooShort || undefined"
        />
        <p
          v-if="tooShort"
          class="error"
          role="alert"
        >
          {{ $t('vacancy.dialog.tooShort') }}
        </p>
        <DialogFooter>
          <Button
            type="submit"
            :disabled="!text.trim()"
          >
            {{ $t('vacancy.dialog.attach') }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>

<style scoped>
@reference "~/assets/css/main.css";

.drop {
  @apply flex flex-col items-center gap-2 rounded-lg border border-dashed p-5 text-center transition-colors;
}

.drop.over {
  @apply border-ring bg-muted;
}

.drop-icon {
  @apply size-6 text-muted-foreground;
}

.hint {
  @apply text-xs text-muted-foreground;
}

.paste {
  @apply flex flex-col gap-2;
}

.label {
  @apply text-sm font-medium;
}

.error {
  @apply text-sm text-destructive;
}
</style>
