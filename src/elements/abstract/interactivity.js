import { constructInterface } from '../../core/interface.js'

export const interactivityInterface = constructInterface({
  interface: {
    interactivity: {
      description: 'Whether interactivity is enabled',
      typecheck: { type: 'boolean' }
    }
  },
  internal: {
    // Interactivity
    interactivity: { computed: 'default', default: true }
  },
  memberFunctions: {
    toggleInteractivity: function () {
      let internal = this.internal
      let interactivity = this.props.get('interactivity')

      if (!!internal.interactivityListeners !== interactivity) {
        interactivity
          ? this.enableInteractivityListeners()
          : this.disableInteractivityListeners()
      }
    }
  }
})
