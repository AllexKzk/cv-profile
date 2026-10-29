// Russian has three plural forms: 1 год, 2 года, 5 лет. vue-i18n only knows the English rule
// out of the box, so messages like "{n}+ год | {n}+ года | {n}+ лет" pick the form via Intl.
const ruPlural = new Intl.PluralRules('ru')
const RU_FORMS: Partial<Record<Intl.LDMLPluralRule, number>> = { one: 0, few: 1, many: 2 }

export default defineI18nConfig(() => ({
  pluralRules: {
    ru: (choice: number) => RU_FORMS[ruPlural.select(choice)] ?? 2,
  },
}))
