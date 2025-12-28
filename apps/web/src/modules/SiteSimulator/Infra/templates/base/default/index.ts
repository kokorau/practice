import { $BaseTemplateMeta, type BaseTemplate } from '../../../../Domain/ValueObject'
import template from './template.html?raw'
import style from './style.css?raw'

export default {
  meta: $BaseTemplateMeta.create(
    'default',
    'Default',
    'Standard page layout with site root container',
    template,
    style
  ),
} satisfies BaseTemplate
