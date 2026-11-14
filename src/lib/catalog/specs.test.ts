import { describe, expect, it } from 'vitest'
import { mergeSpecLayers } from './specs'

describe('mergeSpecLayers', () => {
  it('keeps layer order and appends new labels', () => {
    expect(
      mergeSpecLayers(
        [{ label: 'Марка', value: 'Blum' }],
        [{ label: 'Серия', value: 'CLIP' }, { label: 'Затваряне', value: 'BLUMOTION' }],
        [{ label: 'Каталожен №', value: '79B9550' }],
      ),
    ).toEqual([
      { label: 'Марка', value: 'Blum' },
      { label: 'Серия', value: 'CLIP' },
      { label: 'Затваряне', value: 'BLUMOTION' },
      { label: 'Каталожен №', value: '79B9550' },
    ])
  })

  it('lets a later layer override a line in place, ignoring case and spacing', () => {
    expect(
      mergeSpecLayers(
        [{ label: 'Монтажна пластина', value: '173H7130' }, { label: 'Вариант', value: 'Stollen' }],
        [{ label: ' монтажна  ПЛАСТИНА ', value: '174H7130, с дюбел' }],
      ),
    ).toEqual([
      { label: 'Монтажна пластина', value: '174H7130, с дюбел' },
      { label: 'Вариант', value: 'Stollen' },
    ])
  })

  it('drops empty values and missing lines', () => {
    expect(
      mergeSpecLayers([null, { label: 'Цвят', value: '  ' }, undefined, { label: 'Марка', value: 'Blum' }]),
    ).toEqual([{ label: 'Марка', value: 'Blum' }])
  })
})
