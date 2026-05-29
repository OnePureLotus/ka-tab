import { describe, it, expect } from 'vitest'
import { createNote, updateNoteContent } from '@/features/notes/service'

describe('createNote', () => {
  it('N-01: 手动便签不含 sourceUrl / sourceDomain', () => {
    const note = createNote('Hello')
    expect(note.content).toBe('Hello')
    expect(note.id).toBeTruthy()
    expect(note.createdAt).toBeGreaterThan(0)
    expect(note.updatedAt).toBeGreaterThan(0)
    expect(note.hash).toBeTruthy()
    expect(note.sourceUrl).toBeUndefined()
    expect(note.sourceDomain).toBeUndefined()
  })

  it('N-02: 网页剪藏便签写入 sourceUrl 和 sourceDomain', () => {
    const note = createNote('clipped text', {
      sourceUrl: 'https://foo.com/article',
      sourceDomain: 'foo.com',
    })
    expect(note.sourceUrl).toBe('https://foo.com/article')
    expect(note.sourceDomain).toBe('foo.com')
  })

  it('N-03: 仅传 content 时 sourceUrl / sourceDomain 为 undefined', () => {
    const note = createNote('just content')
    expect(note.sourceUrl).toBeUndefined()
    expect(note.sourceDomain).toBeUndefined()
  })

  it('N-04: 空内容便签可以创建（不在 service 层校验）', () => {
    expect(() => createNote('')).not.toThrow()
    const note = createNote('')
    expect(note.content).toBe('')
  })

  it('N-09: 相同内容两次 createNote 生成相同 hash', () => {
    const n1 = createNote('same content')
    const n2 = createNote('same content')
    expect(n1.hash).toBe(n2.hash)
  })
})

describe('updateNoteContent', () => {
  it('N-05: 更新内容后 hash 变更', () => {
    const note = createNote('original')
    const updated = updateNoteContent(note, 'modified')
    expect(updated.hash).not.toBe(note.hash)
  })

  it('N-06: 更新内容后 updatedAt 增大', () => {
    const note = createNote('original')
    const before = note.updatedAt
    const updated = updateNoteContent(note, 'modified')
    expect(updated.updatedAt).toBeGreaterThanOrEqual(before)
  })

  it('N-07: 更新内容不改变 id', () => {
    const note = createNote('original')
    const updated = updateNoteContent(note, 'modified')
    expect(updated.id).toBe(note.id)
  })

  it('N-08: 更新内容不改变 sourceUrl / sourceDomain', () => {
    const note = createNote('original', {
      sourceUrl: 'https://example.com',
      sourceDomain: 'example.com',
    })
    const updated = updateNoteContent(note, 'modified')
    expect(updated.sourceUrl).toBe('https://example.com')
    expect(updated.sourceDomain).toBe('example.com')
  })
})
