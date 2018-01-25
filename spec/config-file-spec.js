const {it, fit, ffit, beforeEach, afterEach, conditionPromise} = require('./async-spec-helpers')
const fs = require('fs-plus')
const path = require('path')
const temp = require('temp').track()
const dedent = require('dedent')
const ConfigFile = require('../src/config-file')

describe('ConfigFile', () => {
  let filePath, configFile, subscription

  beforeEach(async () => {
    jasmine.useRealClock()
    const tempDir = fs.realpathSync(temp.mkdirSync())
    filePath = path.join(tempDir, 'the-config.cson')
  })

  afterEach(() => {
    subscription.dispose()
  })

  describe('when the file does not exist', () => {
    it('returns an empty object from .get()', async () => {
      configFile = new ConfigFile(filePath)
      subscription = await configFile.watch()
      expect(configFile.get()).toEqual({})
    })
  })

  describe('when the file is empty', () => {
    it('returns an empty object from .get()', async () => {
      writeFileSync(filePath, '')
      configFile = new ConfigFile(filePath)
      subscription = await configFile.watch()
      expect(configFile.get()).toEqual({})
    })
  })

  describe('when the file is updated with valid CSON', () => {
    it('notifies onDidChange observers with the data', async () => {
      configFile = new ConfigFile(filePath)
      subscription = await configFile.watch()

      const event = new Promise(resolve => configFile.onDidChange(resolve))

      writeFileSync(filePath, dedent `
        '*':
          foo: 'bar'

        'javascript':
          foo: 'baz'
      `)

      expect(await event).toEqual({
        '*': {foo: 'bar'},
        'javascript': {foo: 'baz'}
      })

      expect(configFile.get()).toEqual({
        '*': {foo: 'bar'},
        'javascript': {foo: 'baz'}
      })
    })
  })

  describe('when the file is  updated with invalid CSON', () => {
    it('notifies onDidError observers', async () => {
      configFile = new ConfigFile(filePath)
      subscription = await configFile.watch()

      const message = new Promise(resolve => configFile.onDidError(resolve))

      writeFileSync(filePath, dedent `
        um what?
      `)

      expect(await message).toContain('Failed to load `the-config.cson`')

      const event = new Promise(resolve => configFile.onDidChange(resolve))

      writeFileSync(filePath, dedent `
        '*':
          foo: 'bar'

        'javascript':
          foo: 'baz'
      `)

      expect(await event).toEqual({
        '*': {foo: 'bar'},
        'javascript': {foo: 'baz'}
      })
    })
  })

  describe('updating the config', () => {
    it('persists the data to the file', async () => {
      configFile = new ConfigFile(filePath)
      subscription = await configFile.watch()
      await configFile.update({foo: 'bar'})
      expect(fs.readFileSync(filePath, 'utf8')).toBe('foo: "bar"\n')
    })
  })
})

function writeFileSync (filePath, content) {
  const utime = (Date.now() / 1000) + 5
  fs.writeFileSync(filePath, content)
  fs.utimesSync(filePath, utime, utime)
}
