import { Eventful } from './eventful'

describe('Eventful', () => {
  test('add, remove and trigger single listener', () => {
    const evt = new Eventful()
    const callback = jest.fn()
    const data = { name: 'Quinoa' }

    expect(evt.addEventListener('huzzah', callback), 'addEventListener returns self').toBe(evt)
    expect(evt.triggerEvent('huzzah', data), "triggerEvent returns false when listener doesn't return").toBe(false)
    expect(callback).toBeCalledWith(data, evt, 'huzzah')

    callback.mockClear()

    expect(evt.removeEventListener('huzzah', callback), 'removeEventListener returns self').toBe(evt)
    expect(callback, 'callback should not be called after removal').not.toBeCalled()
  })

  test('add, remove, and trigger multiple listeners', () => {
    // callback 1, 2, 3, 4, 5 added, then callback 2, 4 removed
    const evt = new Eventful()
    const callback1 = jest.fn()
    const callback2 = jest.fn()
    const callback3 = jest.fn()
    const callback4 = jest.fn()
    const callback5 = jest.fn()
    const data = { name: 'Quinoa' }

    expect(evt.addEventListener('huzzah', [
      callback1, callback2, callback3, callback4, callback5
    ]), 'addEventListener accepts array').toBe(evt)
    expect(evt.removeEventListener('huzzah', [
      callback2, callback4
    ]), 'addEventListener accepts array').toBe(evt)

    expect(evt.hasEventListenersFor('choochoo'), 'returns false if there are no registered event listeners under the given name').toBe(false)
    expect(evt.hasEventListenersFor('huzzah'), 'returns true if there are registered event listeners under the given name').toBe(true)

    evt.triggerEvent('huzzah', data)

    ;[ callback1, callback3, callback5 ].forEach(c => expect(c).toBeCalledWith(data, evt, 'huzzah'))
    ;[ callback2, callback4 ].forEach(c => expect(c).not.toBeCalled())

    expect(evt.hasEventListenersFor('huzzah'), 'returns true if there are registered event listeners under the given name').toBe(true)

    ;[ callback1, callback2, callback3, callback4, callback5 ].forEach(c => c.mockClear())

    expect(evt.removeEventListeners('huzzah'), 'removeEventListeners returns self').toBe(evt)

    evt.triggerEvent('huzzah')

    ;[ callback1, callback2, callback3, callback4, callback5 ].forEach(c => expect(c).not.toBeCalled())

    expect(evt.hasEventListenersFor('huzzah'), 'returns false if there are no registered event listeners under the given name').toBe(false)
  })

  test('throws on an invalid event name or callback', () => {
    // Event names may be any non-empty string
    const evt = new Eventful()
    const badEventNames = [ 0, -Infinity, '', [] ]
    const badFunctions = [ 3, 'cow' ]

    for (const bad of badEventNames) {
      expect(() => evt.addEventListener(bad, () => null), 'Given bad name: ' + bad).toThrow()
    }

    for (const bad of badFunctions) {
      expect(() => evt.addEventListener('valid event name', bad), 'Given bad callback: ' + bad).toThrow()
    }
  })

  test('removing a listener works', () => {
    const evt = new Eventful()
    const callback = jest.fn()

    evt.addEventListener('choong', callback)
    evt.removeEventListener('choong', callback)

    evt.triggerEvent('choong')

    expect(callback, 'removed listener not called').not.toBeCalled()
    expect(evt.hasEventListenersFor('choong'), 'reports no listeners').toBe(false)
  })

  test("adding a listener twice doesn't mean it gets called twice", () => {
    const evt = new Eventful()
    const callback = jest.fn()

    evt.addEventListener('choong', callback)
    evt.addEventListener('choong', callback)

    evt.triggerEvent('choong')

    expect(callback, 'listener called exactly once').toHaveBeenCalledTimes(1)
  })

  test('getEventListeners works as expected', () => {
    const evt = new Eventful()
    const listeners = [ jest.fn(), jest.fn(), jest.fn(), jest.fn(), jest.fn() ]

    evt.addEventListener('porpoise', listeners)

    const ret = evt.getEventListeners('porpoise')

    expect(ret, 'returned listeners are the same').toEqual(listeners)
  })

  test('calling a nonexistent event does nothing', () => {
    const evt = new Eventful()

    expect(() => evt.triggerEvent('nothingness', 'payload')).not.toThrow()
  })
})
