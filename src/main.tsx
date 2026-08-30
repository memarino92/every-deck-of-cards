import { createRouter } from '@solidjs/router'
import { render } from '@solidjs/web'

import { CardGridPage } from './dev/CardGridPage.tsx'
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

const Router = createRouter({
  routes: [
    { path: '/talk', component: TalkPage },
    {
      path: '/',
      component: Layout,
      children: [
        { path: '/', component: HomePage },
        { path: '/explore', component: ExplorerPage },
        { path: '/dev/cards', component: CardGridPage },
        { path: '/why', component: WhyPage },
        { path: '/how', component: HowPage },
      ],
    },
  ],
})

render(() => <Router>{(props) => props.children}</Router>, root)
