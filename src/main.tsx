import { Route, Router } from '@solidjs/router'
import { render } from 'solid-js/web'

import { ExplorerPage } from './ExplorerPage.tsx'
import { HomePage } from './HomePage.tsx'
import { HowPage } from './HowPage.tsx'
import { Layout } from './Layout.tsx'
import { TalkPage } from './TalkPage.tsx'
import { WhyPage } from './WhyPage.tsx'
import './styles.css'

const root = document.querySelector<HTMLElement>('#root')

if (root === null) {
  throw new Error('Missing application root')
}

render(
  () => (
    <Router>
      <Route path="/talk" component={TalkPage} />
      <Route path="/" component={Layout}>
        <Route path="/" component={HomePage} />
        <Route path="/explore" component={ExplorerPage} />
        <Route path="/why" component={WhyPage} />
        <Route path="/how" component={HowPage} />
      </Route>
    </Router>
  ),
  root,
)
