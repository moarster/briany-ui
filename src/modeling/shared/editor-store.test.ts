import { beforeEach, describe, expect, it } from 'vitest'
import { useEditorStore } from './editor-store'
import { contentHash } from './useFileContent'

describe('editor tab state', () => {
  beforeEach(() => {
    sessionStorage.clear()
    useEditorStore.setState({ tabs: {}, dirty: {} })
  })

  it('opens a tab once, however many times the route is visited', () => {
    const { openTab } = useEditorStore.getState()
    openTab('app', { fileKey: 'orders', name: 'Orders', type: 'bpmn' })
    openTab('app', { fileKey: 'orders', name: 'Orders', type: 'bpmn' })

    expect(useEditorStore.getState().tabs.app).toHaveLength(1)
  })

  it('keeps tabs per application, so switching applications does not mix them', () => {
    const { openTab } = useEditorStore.getState()
    openTab('a', { fileKey: 'one', name: 'One', type: 'bpmn' })
    openTab('b', { fileKey: 'two', name: 'Two', type: 'dmn' })

    expect(useEditorStore.getState().tabs.a?.[0]?.fileKey).toBe('one')
    expect(useEditorStore.getState().tabs.b?.[0]?.fileKey).toBe('two')
  })

  it('mirrors tabs to sessionStorage, so a reload keeps the strip', () => {
    useEditorStore.getState().openTab('app', { fileKey: 'orders', name: 'Orders', type: 'bpmn' })
    expect(JSON.parse(sessionStorage.getItem('briany.tabs.app')!)).toEqual([
      { fileKey: 'orders', name: 'Orders', type: 'bpmn' },
    ])
  })

  it('drops the dirty flag when a tab is closed', () => {
    const store = useEditorStore.getState()
    store.openTab('app', { fileKey: 'orders', name: 'Orders', type: 'bpmn' })
    store.setDirty('app', 'orders', true)
    expect(useEditorStore.getState().isDirty('app', 'orders')).toBe(true)

    useEditorStore.getState().closeTab('app', 'orders')
    expect(useEditorStore.getState().isDirty('app', 'orders')).toBe(false)
    expect(useEditorStore.getState().tabs.app).toHaveLength(0)
  })

  it('reports which tabs are dirty, which is what the leave guard asks', () => {
    const store = useEditorStore.getState()
    store.openTab('app', { fileKey: 'a', name: 'A', type: 'bpmn' })
    store.openTab('app', { fileKey: 'b', name: 'B', type: 'bform' })
    store.setDirty('app', 'b', true)

    expect(
      useEditorStore
        .getState()
        .dirtyTabs('app')
        .map((tab) => tab.fileKey),
    ).toEqual(['b'])
  })
})

describe('content hashing', () => {
  it('is stable for identical content, so a viewport move does not mark a file dirty', () => {
    const xml = '<definitions><process id="a" /></definitions>'
    expect(contentHash(xml)).toBe(contentHash(xml))
  })

  it('differs for content that differs', () => {
    expect(contentHash('<a/>')).not.toBe(contentHash('<b/>'))
  })

  it('notices a change anywhere in a long document', () => {
    const long = '<x>'.repeat(500)
    expect(contentHash(`${long}a`)).not.toBe(contentHash(`${long}b`))
  })
})
