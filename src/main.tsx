import { render } from 'solid-js/web'

import { App } from './App.tsx'
import './styles.css'

const root = document.querySelector<HTMLElement>('#root')

if (root === null) {
  throw new Error('Missing application root')
}

render(() => <App />, root)
