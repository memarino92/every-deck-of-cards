import { Route, Router } from '@solidjs/router'
import { render } from 'solid-js/web'

import { HomePage } from './HomePage.tsx'
import { Layout } from './Layout.tsx'
import { WhyPage } from './WhyPage.tsx'
import './styles.css'

const root = document.querySelector<HTMLElement>('#root')

if (root === null) {
  throw new Error('Missing application root')
}

render(
  () => (
    <Router root={Layout}>
      <Route path="/" component={HomePage} />
      <Route path="/why" component={WhyPage} />
    </Router>
  ),
  root,
)
